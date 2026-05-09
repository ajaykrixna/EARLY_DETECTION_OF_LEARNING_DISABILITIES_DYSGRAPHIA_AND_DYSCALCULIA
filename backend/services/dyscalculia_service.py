import numpy as np
import pickle
from typing import List, Dict, Optional
import os


class DyscalculiaService:
    def __init__(self):
        self.model = None
        self.model_version = "1.4"
        self.feature_names = []
        self.load_model()

    def load_model(self):
        """Load trained SVM model. Strict loading only."""
        try:
            # STRICT REQUIREMENT: Only use this specific model file
            model_path = os.getenv("DYSCALCULIA_MODEL_PATH", "models/dyscalculia_svm_model.pkl")
            
            # 8 Features (Aligned with New Syllabus)
            n_features = 8

            if os.path.exists(model_path):
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
                
                print(f"✅ Dyscalculia model loaded successfully from {model_path}")
                
                # Verify features if possible
                try:
                    if hasattr(self.model, "n_features_in_") and self.model.n_features_in_ != n_features:
                        print(f"⚠️ WARNING: Loaded model expects {self.model.n_features_in_} features, but code generates {n_features}.")
                except:
                    pass
            else:
                print(f"❌ CRITICAL: Model file not found at {model_path}")
                print("⚠️ Please ensure 'dyscalculia_svm_model.pkl' is present in 'backend/models/'")
                self.model = None

        except Exception as e:
            self.model = None
            
    def is_model_loaded(self) -> bool:
        return self.model is not None

    def extract_features(self, responses: List[Dict]) -> np.ndarray:
        """
        Convert quiz responses into 8 Feature Vector:
        1. Avg Response Time
        2. Response Time Variability
        3. Accuracy (Number Sense) - Q1-Q4
        4. Accuracy (Arithmetic)   - Q5-Q6
        5. Accuracy (Working Memory)- Q7-Q8
        6. Accuracy (Speeded)      - Q9
        7. Total Errors
        8. Speed-Accuracy Score
        """
        if not responses:
            return np.zeros((1, 8))

        times = [r.get("time_taken", 0) for r in responses]
        corrects = [1 if r.get("is_correct") else 0 for r in responses]
        
        # 1. Avg Response Time
        avg_time = np.mean(times) if times else 0

        # 2. Response Time Variability
        time_var = np.std(times) if times else 0

        # Category Accuracies
        # We need to map Question IDs to categories based on the syllabus
        # Q1-Q4: Number Sense (id 1,2,3,4)
        # Q5-Q6: Arithmetic (id 5,6)
        # Q7-Q8: Working Memory (id 7,8)
        # Q9: Speeded Response (id 9)
        
        cats = {
            "ns": [1, 2, 3, 4],
            "ar": [5, 6],
            "wm": [7, 8],
            "sp": [9]
        }
        
        cat_correct = {"ns": 0, "ar": 0, "wm": 0, "sp": 0}
        cat_total = {"ns": 0, "ar": 0, "wm": 0, "sp": 0}

        for r in responses:
            qid = r.get("question_id")
            is_cor = 1 if r.get("is_correct") else 0
            
            for cat, ids in cats.items():
                if qid in ids:
                    cat_correct[cat] += is_cor
                    cat_total[cat] += 1
        
        # 3. Acc Number Sense
        acc_ns = (cat_correct["ns"] / cat_total["ns"]) if cat_total["ns"] > 0 else 0
        # 4. Acc Arithmetic
        acc_ar = (cat_correct["ar"] / cat_total["ar"]) if cat_total["ar"] > 0 else 0
        # 5. Acc Working Memory
        acc_wm = (cat_correct["wm"] / cat_total["wm"]) if cat_total["wm"] > 0 else 0
        # 6. Acc Speeded
        acc_sp = (cat_correct["sp"] / cat_total["sp"]) if cat_total["sp"] > 0 else 0

        # 7. Total Errors
        total_errors = len(responses) - sum(corrects)

        # 8. Speed-Accuracy Tradeoff Score
        total_acc = sum(corrects) / len(responses) if responses else 0
        speed_acc_score = (total_acc * 100) / (avg_time + 1)

        features = np.array([
            avg_time,
            time_var,
            acc_ns,
            acc_ar,
            acc_wm,
            acc_sp,
            total_errors,
            speed_acc_score
        ])

        return features.reshape(1, -1)

    def calculate_shap_values(self, features: np.ndarray) -> Dict:
        """Optional SHAP explainability."""
        try:
            import shap
            # Create a small background dataset for SHAP
            background = np.random.normal(size=(10, features.shape[1]))
            
            # Use a generic explainer or KernelExplainer depending on model type
            # Note: KernelExplainer is slow; for MVP/fallback, this might be okay.
            explainer = shap.KernelExplainer(self.model.predict_proba, background)
            shap_values = explainer.shap_values(features)
            
            # shap_values is a list of arrays (one for each class). We usually take the one for the predicted class
            # or just aggregate. For simplicity, we take the mean absolute importance across classes.
            # But here, let's just take the first class or max to keep it simple JSON.
            
            # Since shap_values returns [n_samples, n_features] for each class
            # We'll just grab values for the first instance
            
            feature_names = [
                "Avg Response Time", "Time Variability", "Acc (Num Sense)", 
                "Acc (Arithmetic)", "Acc (Working Mem)", "Acc (Speeded)", 
                "Total Errors", "Speed-Acc Score"
            ]
            
            # Handle multi-class output form of shap_values
            if isinstance(shap_values, list):
                # shap_values[0] is for class 0
                vals = shap_values[0][0]
            else:
                 vals = shap_values[0]

            feature_importance = {
                name: float(val)
                for name, val in zip(feature_names, vals)
            }
            return feature_importance
        except Exception as e:
            print(f"⚠️ SHAP calculation skipped: {e}")
            return {}

    async def predict(self, responses: List[Dict], user_id: Optional[str] = None) -> Dict:
        """Run Dyscalculia prediction based on quiz responses."""
        if not self.is_model_loaded():
            return {
                "error": "Model not loaded",
                "message": "Please ensure the trained SVM model is available in /models/",
                "prediction_class": "Unknown",
                "confidence_score": 0.0,
            }

        try:
            features = self.extract_features(responses)

            # --- Prediction ---
            try:
                predictions = self.model.predict(features)
                probabilities = self.model.predict_proba(features)[0]
            except Exception as e:
                 print(f"❌ Prediction failed with current model/features: {e}")
                 # Fallback logic if model is incompatible with new features (e.g. old pickle)
                 return {
                    "error": "Model compatibility error. Please delete the old .pkl file to regenerate.",
                    "prediction_class": "Error",
                    "confidence_score": 0.0,
                 }

            # Normalise if probabilities are >1 (safety)
            if np.max(probabilities) > 1.0:
                probabilities = probabilities / np.sum(probabilities)

            label_map = {0: "Normal", 1: "Low", 2: "High"}

            pred_idx = int(predictions[0])
            pred_class = label_map.get(pred_idx, str(pred_idx))
            confidence = float(probabilities[pred_idx])  # keep in 0–1 range

            all_probs = {
                label_map.get(int(label), str(label)): round(float(prob), 4)
                for label, prob in zip(self.model.classes_, probabilities)
            }

            # Quiz statistics
            correct_count = sum(1 for r in responses if r.get("is_correct", False))
            total_questions = len(responses)
            accuracy = (correct_count / total_questions * 100) if total_questions else 0

            feature_importance = self.calculate_shap_values(features)

            # Final output
            result = {
                "prediction_class": pred_class,
                "confidence_score": round(confidence, 4),  # e.g., 0.4423
                "all_probabilities": all_probs,            # e.g., 0.4423 not 44.23
                "feature_importance": feature_importance,
                "quiz_statistics": {
                    "total_questions": total_questions,
                    "correct_answers": correct_count,
                    "accuracy": round(accuracy, 2),
                },
                "model_version": self.model_version,
            }

            return result

        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                "error": str(e),
                "prediction_class": "Error",
                "confidence_score": 0.0,
            }

import numpy as np
import cv2
import io
import base64
from typing import Optional, Dict, List
import os
import tensorflow as tf
import tf_keras
import keras

class CompatInputLayer(tf_keras.layers.InputLayer):
    def __init__(self, *args, **kwargs):
        if 'batch_shape' in kwargs:
            batch_shape = kwargs.pop('batch_shape')
            if batch_shape is not None:
                kwargs['input_shape'] = tuple(batch_shape[1:])
        super().__init__(*args, **kwargs)

class DysgraphiaService:
    def __init__(self):
        self.model: Optional[tf.keras.Model] = None
        self.model_version: str = "1.0"
        # ✅ Match your Kaggle label order
        self.class_labels: List[str] = ['high_dysgraphia', 'low_dysgraphia', 'normal']
        self.input_shape = (128, 128, 1)
        self.load_model()

    # -------------------------------------------------------------------------
    # 🔹 Load model
    # -------------------------------------------------------------------------
    def load_model(self):
        try:
            model_path = os.getenv(
                "DYSGRAPHIA_MODEL_PATH",
                "models/rebuilt_model.keras"
            )

            if os.path.exists(model_path):
                self.model = keras.models.load_model(model_path, compile=False)
                self.input_shape = self.model.input_shape[1:]
                print(f"✅ Dysgraphia model loaded successfully from {model_path}")
                print(f"📐 Model expects input shape: {self.input_shape}")
            else:
                print(f"⚠️ Model file not found at {model_path}")
                self.model = None

        except Exception as e:
            print(f"❌ Error loading Dysgraphia model: {e}")
            self.model = None

    def is_model_loaded(self) -> bool:
        return self.model is not None

    # -------------------------------------------------------------------------
    # 🔹 Image preprocessing (OpenCV version — identical to Kaggle)
    # -------------------------------------------------------------------------
    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """Read image bytes using OpenCV grayscale pipeline identical to Kaggle."""
        try:
            # Decode image bytes → OpenCV array
            file_bytes = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_GRAYSCALE)

            # Resize to model input size (128x128)
            img = cv2.resize(img, (128, 128))

            # Normalise & reshape
            img = img.astype("float32") / 255.0
            img = np.expand_dims(img, axis=-1)  # Add grayscale channel
            img = np.expand_dims(img, axis=0)   # Add batch dimension
            return img
        except Exception as e:
            print(f"❌ Error preprocessing image: {e}")
            raise e

    # -------------------------------------------------------------------------
    # 🔹 Grad-CAM generation
    # -------------------------------------------------------------------------
    def generate_gradcam(self, img_array: np.ndarray, pred_index: int) -> Optional[str]:
        """Generate Grad-CAM overlay as base64 image (Split Model approach)."""
        if not self.model:
            return None

        try:
            # 1. Find the last convolutional layer
            last_conv_layer = None
            for layer in reversed(self.model.layers):
                if "Conv" in layer.__class__.__name__:
                    last_conv_layer = layer
                    break

            if last_conv_layer is None:
                print("⚠️ No convolutional layer found for Grad-CAM.")
                return None
            
            # 2. Split Strategy: Input -> Conv, Conv -> Output
            # This ensures we can explicitly watch the intermediate tensor
            
            # Model 1: Full Input -> Conv Output
            # We use the existing model's input.
            # Handle Keras 3 input access
            model_inputs = self.model.inputs if hasattr(self.model, "inputs") else self.model.input
            
            conv_model = tf.keras.models.Model(
                inputs=model_inputs,
                outputs=last_conv_layer.output
            )

            # Model 2: Conv Output -> Final Output
            # We cannot use self.model.output directly. We must reconstruct the path.
            last_conv_index = self.model.layers.index(last_conv_layer)
            
            # Create a new input tensor with the shape of the conv layer's output (excluding batch dim)
            # shape is usually (height, width, filters)
            cls_input_shape = last_conv_layer.output.shape[1:]
            classifier_input = tf.keras.Input(shape=cls_input_shape)
            x = classifier_input
            
            # Apply all subsequent layers
            for layer in self.model.layers[last_conv_index+1:]:
                x = layer(x)
                
            classifier_model = tf.keras.models.Model(
                inputs=classifier_input,
                outputs=x
            )

            # Execution
            with tf.GradientTape() as tape:
                # Compute activations 
                # Note: predict() returns numpy, calls(x) returns tensor. We need tensor.
                conv_outputs = conv_model(img_array)
                # Cast to float32 to be safe
                conv_outputs = tf.cast(conv_outputs, tf.float32)
                
                # CRITICAL: Watch the intermediate tensor!
                tape.watch(conv_outputs)
                
                # Forward pass through classifier
                predictions = classifier_model(conv_outputs)
                loss = predictions[:, pred_index]

            # Compute gradients
            grads = tape.gradient(loss, conv_outputs)
            
            if grads is None:
                print("❌ Grad-CAM: Gradients are still None. Graph is disconnected.")
                return None

            # 4. Generate Heatmap
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            
            # Handle dimensions
            if len(conv_outputs.shape) == 4:
                 conv_outputs = conv_outputs[0]
            
            heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
            heatmap = heatmap.numpy()

            # 5. Overlay
            heatmap = cv2.resize(heatmap, (128, 128))
            heatmap = np.uint8(255 * heatmap)
            heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

            base_img = np.uint8(255 * img_array[0])
            base_img = np.repeat(base_img, 3, axis=-1)

            superimposed = cv2.addWeighted(base_img, 0.6, heatmap, 0.4, 0)
            _, buffer = cv2.imencode(".png", superimposed)
            gradcam_base64 = base64.b64encode(buffer).decode("utf-8")
            return f"data:image/png;base64,{gradcam_base64}"

        except Exception as e:
            print(f"❌ Error generating Grad-CAM: {e}")
            import traceback
            traceback.print_exc()
            return None

    # -------------------------------------------------------------------------
    # 🔹 Single image prediction
    # -------------------------------------------------------------------------
    async def predict(self, image_bytes: bytes, user_id: Optional[str] = None) -> Dict:
        """Run prediction on one image, identical to Kaggle preprocessing."""
        if not self.is_model_loaded():
            return {
                "error": "Model not loaded",
                "prediction_class": "Unknown",
                "confidence_score": 0.0
            }

        try:
            img_array = self.preprocess_image(image_bytes)
            pred_prob = self.model.predict(img_array, verbose=0)[0]
            pred_class = int(np.argmax(pred_prob))
            pred_label = self.class_labels[pred_class]
            confidence = float(pred_prob[pred_class])

            gradcam_url = self.generate_gradcam(img_array, pred_class)

            return {
                "prediction_class": pred_label,
                "confidence_score": confidence,
                "all_probabilities": {
                    label: float(pred_prob[i]) if i < len(pred_prob) else 0.0
                    for i, label in enumerate(self.class_labels)
                },
                "gradcam_url": gradcam_url,
                "model_version": self.model_version
            }

        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return {
                "error": str(e),
                "prediction_class": "Error",
                "confidence_score": 0.0
            }

    # -------------------------------------------------------------------------
    # 🔹 Batch prediction (same OpenCV preprocessing)
    # -------------------------------------------------------------------------
    async def predict_batch(self, image_files: List[bytes], user_id: Optional[str] = None) -> Dict:
        """Predict multiple images in one request."""
        if not self.is_model_loaded():
            return {"error": "Model not loaded", "predictions": []}

        results = []
        try:
            for i, image_bytes in enumerate(image_files):
                img_array = self.preprocess_image(image_bytes)
                pred_prob = self.model.predict(img_array, verbose=0)[0]
                pred_class = int(np.argmax(pred_prob))
                pred_label = self.class_labels[pred_class]
                confidence = float(pred_prob[pred_class])

                gradcam_url = self.generate_gradcam(img_array, pred_class)

                results.append({
                    "index": i,
                    "prediction_class": pred_label,
                    "confidence_score": confidence,
                    "all_probabilities": {
                        label: float(pred_prob[j]) if j < len(pred_prob) else 0.0
                        for j, label in enumerate(self.class_labels)
                    },
                    "gradcam_url": gradcam_url
                })

            return {"batch_size": len(results), "predictions": results}

        except Exception as e:
            print(f"❌ Batch prediction error: {e}")
            return {"error": str(e), "predictions": []}

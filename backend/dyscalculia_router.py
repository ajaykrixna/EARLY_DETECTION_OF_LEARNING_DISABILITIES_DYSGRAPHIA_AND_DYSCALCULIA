from fastapi import APIRouter
import joblib
import numpy as np
from pydantic import BaseModel

router = APIRouter()
model = joblib.load("models/dyscalculia_model.pkl")

class QuizResponse(BaseModel):
    user_id: str | None = None
    responses: list
    quiz_statistics: dict

@router.post("/predict")
def predict_dyscalculia(data: QuizResponse):
    accuracy = data.quiz_statistics["accuracy"] / 100.0
    avg_time = np.mean([r["time_taken"] for r in data.responses])
    difficulty_score = np.mean([
        1 if r["difficulty"] == "easy" else 2 if r["difficulty"] == "medium" else 3
        for r in data.responses
    ])

    features = np.array([[accuracy, avg_time, difficulty_score]])
    prediction = model.predict(features)[0]
    probs = model.predict_proba(features)[0]
    prob_dict = {cls: float(p) for cls, p in zip(model.classes_, probs)}

    confidence = float(np.max(probs))

    return {
        "prediction_class": prediction,
        "confidence_score": confidence,
        "all_probabilities": prob_dict,
        "quiz_statistics": data.quiz_statistics
    }

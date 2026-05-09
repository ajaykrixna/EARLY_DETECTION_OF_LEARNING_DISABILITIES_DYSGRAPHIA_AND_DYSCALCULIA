from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import models
import schemas
from database import get_db
from dependencies import get_current_user
from services.dyscalculia_service import DyscalculiaService

router = APIRouter(prefix="/api/dyscalculia", tags=["Dyscalculia"])
dyscalculia_service = DyscalculiaService()

class DyscalculiaQuizRequest(schemas.BaseModel):
    responses: List[Dict[str, Any]]

@router.post("/predict")
async def predict_dyscalculia(
    request: DyscalculiaQuizRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = await dyscalculia_service.predict(request.responses, current_user.id)

        db_record = models.DyscalculiaTest(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            quiz_responses=request.responses,
            prediction_class=result.get("prediction_class", "Unknown"),
            confidence_score=result.get("confidence_score", 0.0),
            feature_importance=result.get("feature_importance", {}),
            model_version=result.get("model_version", "1.0")
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        result["test_id"] = db_record.id
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

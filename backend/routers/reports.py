from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import models
from database import get_db
from dependencies import get_current_user
from services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["Reports"])
report_service = ReportService()

@router.post("/generate_instant")
async def generate_instant_report(request: Dict[str, Any]):
    """Generate PDF report directly from provided JSON data (bypassing DB)."""
    try:
        test_type = request.get("test_type", "unknown")
        data = request.get("data", {})
        
        pdf_path = await report_service.generate_pdf_report(test_type, data)
        
        test_id = data.get("test_id", "instant")
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_{test_id}.pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{test_id}")
async def get_report(
    test_id: str,
    test_type: str, # "dysgraphia" or "dyscalculia"
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        data = {}
        if test_type == "dysgraphia":
            record = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.id == test_id).first()
            if not record:
                 raise HTTPException(status_code=404, detail="Test not found")
            
            allowed_roles = ["admin", "teacher", "doctor"]
            
            if current_user.role == "parent":
                link = db.query(models.ParentStudentLink).filter(
                    models.ParentStudentLink.parent_id == current_user.id,
                    models.ParentStudentLink.student_id == record.user_id
                ).first()
                if not link:
                    raise HTTPException(status_code=403, detail="Parent not linked to this student")
            elif record.user_id != current_user.id and current_user.role not in allowed_roles:
                 raise HTTPException(status_code=403, detail="Not authorized")
            
            data = {
                "test_id": record.id,
                "created_at": record.created_at.isoformat(),
                "image_url": record.image_url,
                "prediction_class": record.prediction_class,
                "confidence_score": record.confidence_score,
                "gradcam_url": record.gradcam_url,
                "model_version": record.model_version
            }
            
        elif test_type == "dyscalculia":
            record = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.id == test_id).first()
            if not record:
                 raise HTTPException(status_code=404, detail="Test not found")
            
            allowed_roles = ["admin", "teacher", "doctor"]
            
            if current_user.role == "parent":
                link = db.query(models.ParentStudentLink).filter(
                    models.ParentStudentLink.parent_id == current_user.id,
                    models.ParentStudentLink.student_id == record.user_id
                ).first()
                if not link:
                    raise HTTPException(status_code=403, detail="Parent not linked to this student")
            elif record.user_id != current_user.id and current_user.role not in allowed_roles:
                 raise HTTPException(status_code=403, detail="Not authorized")
            
            data = {
                "test_id": record.id,
                "created_at": record.created_at.isoformat(),
                "quiz_responses": record.quiz_responses,
                "prediction_class": record.prediction_class,
                "confidence_score": record.confidence_score,
                "feature_importance": record.feature_importance,
                "model_version": record.model_version
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid test type")

        pdf_path = await report_service.generate_pdf_report(test_type, data)
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_{test_id}.pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

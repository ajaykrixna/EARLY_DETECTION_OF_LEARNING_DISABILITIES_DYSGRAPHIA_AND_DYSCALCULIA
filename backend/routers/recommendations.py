from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List
import uuid
import schemas
import models
from database import get_db
from dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.post("", response_model=schemas.RecommendationResponse, dependencies=[Depends(require_role(["doctor", "teacher"]))])
def create_recommendation(
    rec: schemas.RecommendationCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    new_rec = models.Recommendation(
        id=str(uuid.uuid4()),
        student_id=rec.student_id,
        doctor_id=current_user.id,
        content=rec.content
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    
    return schemas.RecommendationResponse(
        id=new_rec.id,
        student_id=new_rec.student_id,
        doctor_id=new_rec.doctor_id,
        content=new_rec.content,
        is_read=bool(new_rec.is_read),
        is_important=bool(new_rec.is_important),
        is_archived=bool(new_rec.is_archived),
        reply_text=new_rec.reply_text,
        created_at=new_rec.created_at,
        doctor_name=current_user.full_name
    )

@router.get("/{student_id}", response_model=List[schemas.RecommendationResponse], dependencies=[Depends(require_role(["student", "doctor", "teacher", "parent", "admin"]))])
def get_student_recommendations(
    student_id: str, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Students can see their own, Doctors/Teachers/Admins can see any
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    recs = db.query(models.Recommendation).filter(models.Recommendation.student_id == student_id).all()
    
    results = []
    for r in recs:
        doc = db.query(models.User).filter(models.User.id == r.doctor_id).first()
        results.append(schemas.RecommendationResponse(
            id=r.id,
            student_id=r.student_id,
            doctor_id=r.doctor_id,
            content=r.content,
            is_read=bool(r.is_read),
            is_important=bool(r.is_important),
            is_archived=bool(r.is_archived),
            reply_text=r.reply_text,
            created_at=r.created_at,
            doctor_name=doc.full_name if doc else "Unknown Doctor"
        ))
    return results

@router.put("/{rec_id}", response_model=schemas.RecommendationResponse, dependencies=[Depends(require_role(["student", "doctor", "parent"]))])
def update_recommendation(
    rec_id: str,
    update_data: schemas.RecommendationUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(models.Recommendation).filter(models.Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    if current_user.role == "student" and rec.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if update_data.is_read is not None: rec.is_read = update_data.is_read
    if update_data.is_important is not None: rec.is_important = update_data.is_important
    if update_data.is_archived is not None: rec.is_archived = update_data.is_archived
    if update_data.reply_text is not None: rec.reply_text = update_data.reply_text
        
    db.commit()
    db.refresh(rec)
    
    doc = db.query(models.User).filter(models.User.id == rec.doctor_id).first()
    return schemas.RecommendationResponse(
        id=rec.id,
        student_id=rec.student_id,
        doctor_id=rec.doctor_id,
        content=rec.content,
        is_read=bool(rec.is_read),
        is_important=bool(rec.is_important),
        is_archived=bool(rec.is_archived),
        reply_text=rec.reply_text,
        created_at=rec.created_at,
        doctor_name=doc.full_name if doc else "Unknown Doctor"
    )

@router.delete("/{rec_id}", dependencies=[Depends(require_role(["student", "doctor", "admin"]))])
def delete_recommendation(
    rec_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(models.Recommendation).filter(models.Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
        
    # Allow student to clear their own, or doctor/admin to delete
    if current_user.role == "student":
        if rec.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
    db.delete(rec)
    db.commit()
    return {"message": "Recommendation deleted"}

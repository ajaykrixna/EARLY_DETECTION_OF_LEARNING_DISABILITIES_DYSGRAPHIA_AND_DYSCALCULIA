from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
import models
import schemas
from database import get_db
from dependencies import get_current_user, require_role
from datetime import datetime

router = APIRouter(prefix="/api/classrooms", tags=["Classrooms"])

@router.post("", response_model=schemas.ClassroomResponse, dependencies=[Depends(require_role(["teacher", "admin"]))])
def create_class(
    classroom: schemas.ClassroomCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_class = models.Classroom(
        id=str(uuid.uuid4()),
        teacher_id=current_user.id,
        title=classroom.title,
        description=classroom.description,
        start_time=classroom.start_time,
        end_time=classroom.end_time,
        status="scheduled",
        created_by=current_user.id,
        student_ids=[] # Initializing empty
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.get("", response_model=List[schemas.ClassroomResponse])
def get_classes(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_time = datetime.utcnow()
    
    # Auto-cleanup expired classes FIRST
    expired = db.query(models.Classroom).filter(
        models.Classroom.status.in_(["scheduled", "live"]),
        models.Classroom.end_time < current_time
    ).all()
    
    for c in expired:
        c.status = "completed"
        db.add(c)
    db.commit()

    # Querying based on role and relations
    query = db.query(models.Classroom)
    if current_user.role == "teacher":
        query = query.filter(models.Classroom.teacher_id == current_user.id)
    elif current_user.role == "student":
        # Only show classes where student is linked to the teacher or specifically invited
        pass # For now show all, but in prod filter by TeacherStudentRelation
        
    classes = query.all()
    results = []
    
    for c in classes:
        teacher = db.query(models.User).filter(models.User.id == c.teacher_id).first()
        results.append(schemas.ClassroomResponse(
            id=c.id,
            title=c.title,
            description=c.description,
            teacher_id=c.teacher_id,
            start_time=c.start_time,
            end_time=c.end_time,
            status=c.status,
            teacher_name=teacher.full_name if teacher else "Unknown",
            student_ids=c.student_ids or []
        ))
    return results

@router.delete("/{class_id}", dependencies=[Depends(require_role(["teacher", "admin"]))])
def delete_class(
    class_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom = db.query(models.Classroom).filter(models.Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
    
    if current_user.role == "teacher" and classroom.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")
        
    db.delete(classroom)
    db.commit()
    return {"message": "Class deleted"}

@router.put("/{class_id}/status", dependencies=[Depends(require_role(["teacher", "admin"]))])
def update_class_status(
    class_id: str,
    status: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom = db.query(models.Classroom).filter(models.Classroom.id == class_id).first()
    if not classroom:
        raise HTTPException(status_code=404, detail="Class not found")
        
    if current_user.role == "teacher" and classroom.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your class")

    current_time = datetime.utcnow()
    
    # 2. START CLASS VALIDATION
    if status == "live":
        if current_time < classroom.start_time:
            raise HTTPException(status_code=400, detail="Cannot start class before scheduled time")
        if current_time > classroom.end_time:
            raise HTTPException(status_code=400, detail="Cannot start class after scheduled end time")
            
    classroom.status = status.lower()
    db.commit()
    return {"message": f"Class status updated to {status}", "status": status}

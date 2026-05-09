from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
import models, schemas
from database import get_db
from dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/teacher", tags=["Teacher"])

@router.post("/students/{student_id}/link")
def link_student_to_teacher(
    student_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can link students")
    
    student = db.query(models.User).filter(models.User.id == student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = db.query(models.TeacherStudentRelation).filter(
        models.TeacherStudentRelation.teacher_id == current_user.id,
        models.TeacherStudentRelation.student_id == student.id
    ).first()
    
    if existing:
        return {"message": "Student already linked"}

    new_rel = models.TeacherStudentRelation(
        id=str(uuid.uuid4()),
        teacher_id=current_user.id,
        student_id=student.id,
        created_by=current_user.id
    )
    db.add(new_rel)
    db.commit()
    return {"message": "Student linked to your roster"}

@router.delete("/students/{student_id}/unlink")
def unlink_student_from_teacher(
    student_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can unlink students")
    
    rel = db.query(models.TeacherStudentRelation).filter(
        models.TeacherStudentRelation.teacher_id == current_user.id,
        models.TeacherStudentRelation.student_id == student_id
    ).first()
    
    if not rel:
        raise HTTPException(status_code=404, detail="Relation not found")
        
    db.delete(rel)
    db.commit()
    return {"message": "Student removed from your roster"}

@router.get("/students/{student_id}/family", response_model=List[Dict[str, Any]])
def get_student_family(
    student_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify teacher relationship first
    rel = db.query(models.TeacherStudentRelation).filter(
        models.TeacherStudentRelation.teacher_id == current_user.id,
        models.TeacherStudentRelation.student_id == student_id
    ).first()
    if not rel:
        raise HTTPException(status_code=403, detail="You do not have institutional access to this student's family data")

    # Find parents linked to this student
    links = db.query(models.ParentStudentLink).filter(models.ParentStudentLink.student_id == student_id).all()
    parents = []
    for link in links:
        p = db.query(models.User).filter(models.User.id == link.parent_id).first()
        if p:
            parents.append({"id": p.id, "full_name": p.full_name, "role": "parent"})
    
    return parents


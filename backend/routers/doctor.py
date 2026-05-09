from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db
from dependencies import get_current_user, require_role
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/doctor", tags=["Doctor"])

# Helper for auditing
def log_action(db: Session, actor_id: str, role: str, action: str, target_type: str, target_id: str, request: Request):
    log = models.AuditLog(
        id=str(uuid.uuid4()),
        actor_id=actor_id,
        actor_role=role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        timestamp=datetime.utcnow(),
        ip_address=request.client.host if request.client else "unknown"
    )
    db.add(log)
    db.commit()

@router.get("/students", response_model=List[schemas.StudentSummary])
def get_assigned_students(
    current_user: models.User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
):
    # Relational check: Only active links created via appointments
    relations = db.query(models.DoctorStudentRelation).filter(
        models.DoctorStudentRelation.doctor_id == current_user.id,
        models.DoctorStudentRelation.active == True
    ).all()
    
    student_ids = [r.student_id for r in relations]
    students = db.query(models.User).filter(models.User.id.in_(student_ids)).all()
    
    for student in students:
        student.dysgraphia_risk = "Low"
        student.dyscalculia_risk = "Low"
        
    return students

@router.delete("/relation/{student_id}")
def revoke_relation(
    student_id: str,
    current_user: models.User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
):
    relation = db.query(models.DoctorStudentRelation).filter(
        models.DoctorStudentRelation.doctor_id == current_user.id,
        models.DoctorStudentRelation.student_id == student_id
    ).first()
    
    if not relation:
        raise HTTPException(status_code=404, detail="Relation not found")
        
    relation.active = False
    db.commit()
    return {"message": "Clinical relationship revoked"}

@router.get("/treatment-plans/{student_id}", response_model=List[schemas.TreatmentPlanResponse])
def get_treatment_plans(
    student_id: str,
    current_user: models.User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
):
    # Relational ownership check
    relation = db.query(models.DoctorStudentRelation).filter(
        models.DoctorStudentRelation.doctor_id == current_user.id,
        models.DoctorStudentRelation.student_id == student_id,
        models.DoctorStudentRelation.active == True
    ).first()
    
    if not relation:
        raise HTTPException(status_code=403, detail="Access denied: Student not linked to you")
        
    plans = db.query(models.TreatmentPlan).filter(
        models.TreatmentPlan.student_id == student_id,
        models.TreatmentPlan.doctor_id == current_user.id
    ).all()
    return plans

@router.post("/treatment-plans", response_model=schemas.TreatmentPlanResponse)
def create_treatment_plan(
    plan: schemas.TreatmentPlanCreate,
    request: Request,
    current_user: models.User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
):
    # Relational active check
    relation = db.query(models.DoctorStudentRelation).filter(
        models.DoctorStudentRelation.doctor_id == current_user.id,
        models.DoctorStudentRelation.student_id == plan.student_id,
        models.DoctorStudentRelation.active == True
    ).first()
    
    if not relation:
        raise HTTPException(status_code=403, detail="Cannot create plan for unlinked student")
        
    new_plan = models.TreatmentPlan(
        id=str(uuid.uuid4()),
        doctor_id=current_user.id,
        student_id=plan.student_id,
        content=plan.content,
        created_by=current_user.id
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    log_action(db, current_user.id, "doctor", "CREATE_PLAN", "treatment_plan", new_plan.id, request)
    return new_plan

@router.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_my_audit_logs(
    current_user: models.User = Depends(require_role(["doctor"])),
    db: Session = Depends(get_db)
):
    return db.query(models.AuditLog).filter(models.AuditLog.actor_id == current_user.id).all()

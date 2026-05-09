from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from dependencies import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/api/parents", tags=["Parents"])

@router.post("/request-link")
def request_link(
    student_email: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can initiate link protocols")
    
    student = db.query(models.User).filter(models.User.email == student_email, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student identity not found in the global registry")

    # Check if a pending or active link exists
    existing_link = db.query(models.ParentStudentLink).filter(
        models.ParentStudentLink.parent_id == current_user.id,
        models.ParentStudentLink.student_id == student.id
    ).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="Active connection already established")

    existing_req = db.query(models.ParentStudentRequest).filter(
        models.ParentStudentRequest.parent_id == current_user.id,
        models.ParentStudentRequest.student_email == student_email,
        models.ParentStudentRequest.status == "pending"
    ).first()
    if existing_req:
        return {"message": "Verification request is already in transmission"}

    new_req = models.ParentStudentRequest(
        id=str(uuid.uuid4()),
        parent_id=current_user.id,
        student_email=student_email,
        status="pending",
        created_by=current_user.id
    )
    db.add(new_req)
    db.commit()
    return {"message": "Secure link request dispatched to student for institutional approval"}

@router.get("/requests", response_model=List[schemas.ParentStudentRequestResponse])
def get_parent_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "student":
        requests = db.query(models.ParentStudentRequest).filter(
            models.ParentStudentRequest.student_email == current_user.email,
            models.ParentStudentRequest.status == "pending"
        ).all()
        for r in requests:
            parent = db.query(models.User).filter(models.User.id == r.parent_id).first()
            r.parent_name = parent.full_name if parent else "Anonymous Parent"
        return requests
    elif current_user.role == "parent":
        return db.query(models.ParentStudentRequest).filter(
            models.ParentStudentRequest.parent_id == current_user.id,
            models.ParentStudentRequest.status == "pending"
        ).all()
    return []

@router.post("/requests/{request_id}/approve")
def approve_link(
    request_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(models.ParentStudentRequest).filter(
        models.ParentStudentRequest.id == request_id,
        models.ParentStudentRequest.student_email == current_user.email,
        models.ParentStudentRequest.status == "pending"
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request identification failed or target mismatch")

    req.status = "approved"
    
    # Create the verified link
    new_link = models.ParentStudentLink(
        id=str(uuid.uuid4()),
        parent_id=req.parent_id,
        student_id=current_user.id,
        created_by=req.parent_id
    )
    db.add(new_link)
    db.commit()
    return {"message": "Relational link fully operational and verified"}

@router.get("/children")
def get_children(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "parent":
        raise HTTPException(status_code=403, detail="Operational access restricted to parent accounts")
    
    links = db.query(models.ParentStudentLink).filter(models.ParentStudentLink.parent_id == current_user.id).all()
    children = []
    for link in links:
        child = db.query(models.User).filter(models.User.id == link.student_id).first()
        if child:
            dysgraphia_tests = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.user_id == child.id).count()
            dyscalculia_tests = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.user_id == child.id).count()
            
            # Simple risk logic for UI consistency
            d_risk = "Low"
            # Get the latest test to determine current risk
            latest_d_test = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.user_id == child.id).order_by(models.DysgraphiaTest.created_at.desc()).first()
            if latest_d_test:
                if latest_d_test.prediction_class == "high_dysgraphia":
                    d_risk = "High"
                elif latest_d_test.prediction_class == "low_dysgraphia":
                    d_risk = "Elevated"
            elif dysgraphia_tests > 0:
                d_risk = "Stable"

            c_risk = "Low"
            latest_c_test = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.user_id == child.id).order_by(models.DyscalculiaTest.created_at.desc()).first()
            if latest_c_test:
                if latest_c_test.prediction_class == "High":
                    c_risk = "High"
                elif latest_c_test.prediction_class == "Low":
                    c_risk = "Elevated"
            elif dyscalculia_tests > 0:
                c_risk = "Stable"

            children.append({
                "id": child.id,
                "full_name": child.full_name,
                "email": child.email,
                "age": child.age,
                "dysgraphia_tests": dysgraphia_tests,
                "dyscalculia_tests": dyscalculia_tests,
                "dysgraphia_risk": d_risk,
                "dyscalculia_risk": c_risk
            })
    return children

@router.get("/students/{student_id}/care-team")
def get_care_team(
    student_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify parental relationship boundary
    link = db.query(models.ParentStudentLink).filter(
        models.ParentStudentLink.parent_id == current_user.id,
        models.ParentStudentLink.student_id == student_id
    ).first()
    if not link:
        raise HTTPException(status_code=403, detail="Cross-account data boundary violation")

    # Enumerate Educator Node connections
    teacher_links = db.query(models.TeacherStudentRelation).filter(models.TeacherStudentRelation.student_id == student_id).all()
    teachers = []
    for tl in teacher_links:
        t = db.query(models.User).filter(models.User.id == tl.teacher_id).first()
        if t: teachers.append({"id": t.id, "full_name": t.full_name, "role": "teacher"})

    # Enumerat Clinical Provider connections
    doctor_links = db.query(models.DoctorStudentRelation).filter(
        models.DoctorStudentRelation.student_id == student_id,
        models.DoctorStudentRelation.active == True
    ).all()
    doctors = []
    for dl in doctor_links:
        d = db.query(models.User).filter(models.User.id == dl.doctor_id).first()
        if d: doctors.append({
            "id": d.id, 
            "full_name": d.full_name, 
            "role": "doctor", 
            "specialization": (d.preferences or {}).get("specialization", "Pediatric Specialist")
        })

    return {
        "teachers": teachers,
        "doctors": doctors,
        "therapists": []
    }


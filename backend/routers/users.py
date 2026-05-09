from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import schemas
import models
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["Users"])

@router.get("/user/{user_id}/tests")
async def get_user_tests(
    user_id: str, 
    test_type: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security check: User can only see their own tests, unless they are staff or linked parent
    is_authorized = False

    if current_user.id == user_id:
        is_authorized = True
    elif current_user.role == "admin":
        is_authorized = True
    elif current_user.role == "teacher":
        # 4. STUDENT ACCESS VALIDATION
        link = db.query(models.TeacherStudentRelation).filter(
            models.TeacherStudentRelation.teacher_id == current_user.id,
            models.TeacherStudentRelation.student_id == user_id
        ).first()
        if link:
            is_authorized = True
    elif current_user.role == "doctor":
        # Relational check: Only if patient is linked and active
        link = db.query(models.DoctorStudentRelation).filter(
            models.DoctorStudentRelation.doctor_id == current_user.id,
            models.DoctorStudentRelation.student_id == user_id,
            models.DoctorStudentRelation.active == True
        ).first()
        if link:
            is_authorized = True
    elif current_user.role == "parent":
        # Check link
        link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == current_user.id,
            models.ParentStudentLink.student_id == user_id
        ).first()
        if link:
            is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to view these tests")

    results = {}
    if not test_type or test_type == "dysgraphia":
        tests = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.user_id == user_id).order_by(models.DysgraphiaTest.created_at.desc()).all()
        results["dysgraphia"] = tests

    if not test_type or test_type == "dyscalculia":
        tests = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.user_id == user_id).order_by(models.DyscalculiaTest.created_at.desc()).all()
        results["dyscalculia"] = tests
        
    return results

@router.post("/user/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validate file
        ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"]
        if file.content_type not in ALLOWED_MIME_TYPES:
             raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG allowed.")

        # Save file locally (in production use S3)
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{current_user.id}_avatar.{file_ext}"
        os.makedirs("uploads/avatars", exist_ok=True)
        file_path = f"uploads/avatars/{filename}"
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
            
        avatar_url = f"http://localhost:8000/static/avatars/{filename}"
        
        current_user.avatar_url = avatar_url
        db.commit()
        db.refresh(current_user)
        
        return {"avatar_url": avatar_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/export")
async def export_user_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all user-related data as a single JSON object."""
    try:
        data = {
            "profile": {
                "full_name": current_user.full_name,
                "email": current_user.email,
                "role": current_user.role,
                "age": current_user.age,
                "created_at": current_user.created_at.isoformat()
            },
            "dysgraphia_tests": [
                {
                    "prediction_class": t.prediction_class,
                    "confidence_score": t.confidence_score,
                    "created_at": t.created_at.isoformat()
                } for t in current_user.dysgraphia_tests
            ],
            "dyscalculia_tests": [
                {
                    "prediction_class": t.prediction_class,
                    "confidence_score": t.confidence_score,
                    "quiz_responses": t.quiz_responses,
                    "created_at": t.created_at.isoformat()
                } for t in current_user.dyscalculia_tests
            ]
        }
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.delete("/user/me")
async def delete_my_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Self-deletion of account and all associated data."""
    try:
        db.delete(current_user)
        db.commit()
        return {"message": "Account permanently deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Deletion failed")

# --- Admin User Management ---

@router.get("/users", response_model=List[schemas.UserProfile])
def get_all_users(
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).offset(skip).limit(limit).all()

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str, 
    role_update: schemas.UserRoleUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role_update.role
    db.commit()
    return {"message": "Role updated"}

@router.get("/teachers", response_model=List[schemas.UserProfile])
def get_teachers(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Allow parents and students to see teachers
    return db.query(models.User).filter(models.User.role == "teacher").all()

@router.get("/users/students", response_model=List[schemas.StudentSummary])
def get_students(
    email: Optional[str] = None,
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if current_user.role not in ["teacher", "doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(models.User).filter(models.User.role == "student")
    
    if current_user.role == "teacher":
        # If searching by email, allow finding any student to enable linking
        if email:
            from sqlalchemy import func
            query = query.filter(func.lower(models.User.email) == email.lower())
        else:
            # Otherwise, only show students already in their roster
            student_ids = [r.student_id for r in db.query(models.TeacherStudentRelation).filter(models.TeacherStudentRelation.teacher_id == current_user.id).all()]
            query = query.filter(models.User.id.in_(student_ids))
    elif current_user.role == "doctor":
         # Doctors list assigned only
         student_ids = [r.student_id for r in db.query(models.DoctorStudentRelation).filter(models.DoctorStudentRelation.doctor_id == current_user.id, models.DoctorStudentRelation.active == True).all()]
         query = query.filter(models.User.id.in_(student_ids))

    if email:
        from sqlalchemy import func
        query = query.filter(func.lower(models.User.email) == email.lower())
        
    students = query.all()
    
    summary_list = []
    for student in students:
        d_test = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.user_id == student.id).order_by(models.DysgraphiaTest.created_at.desc()).first()
        d_risk = "Unknown"
        if d_test:
            label = d_test.prediction_class.lower()
            if "high" in label: d_risk = "High"
            elif "low" in label: d_risk = "Low"
            else: d_risk = "Normal"
            
        c_test = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.user_id == student.id).order_by(models.DyscalculiaTest.created_at.desc()).first()
        c_risk = "Unknown"
        if c_test:
             label = c_test.prediction_class.lower()
             if "high" in label or "risk" in label: c_risk = "High"
             elif "low" in label: c_risk = "Low"
             else: c_risk = "Normal"
             
        summary_list.append(schemas.StudentSummary(
            id=str(student.id),
            email=student.email,
            full_name=student.full_name,
            role=student.role,
            age=student.age,
            language_preference=student.language_preference,
            avatar_url=student.avatar_url,
            created_at=student.created_at,
            dysgraphia_risk=d_risk,
            dyscalculia_risk=c_risk
        ))
        
    return summary_list

@router.get("/analytics/class", response_model=schemas.TeacherRiskAnalytics)
def get_class_analytics(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(models.User).filter(models.User.role == "student")
    if current_user.role == "teacher":
        student_ids = [r.student_id for r in db.query(models.TeacherStudentRelation).filter(models.TeacherStudentRelation.teacher_id == current_user.id).all()]
        query = query.filter(models.User.id.in_(student_ids))
        
    students = query.all()
    
    dysgraphia_counts = {"High": 0, "Low": 0, "Normal": 0}
    dyscalculia_counts = {"High": 0, "Low": 0, "Normal": 0} 
    
    for student in students:
        d_test = db.query(models.DysgraphiaTest).filter(models.DysgraphiaTest.user_id == student.id).order_by(models.DysgraphiaTest.created_at.desc()).first()
        if d_test:
            label = d_test.prediction_class.lower()
            key = "High" if "high" in label else "Low" if "low" in label else "Normal"
            dysgraphia_counts[key] += 1
            
        c_test = db.query(models.DyscalculiaTest).filter(models.DyscalculiaTest.user_id == student.id).order_by(models.DyscalculiaTest.created_at.desc()).first()
        if c_test:
             label = c_test.prediction_class.lower()
             key = "High" if ("high" in label or "risk" in label) else "Low" if "low" in label else "Normal"
             dyscalculia_counts[key] += 1
             
    return {
        "dysgraphia": dysgraphia_counts,
        "dyscalculia": dyscalculia_counts,
        "total_students": len(students)
    }


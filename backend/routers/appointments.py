from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
import models
import schemas
from database import get_db
from dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])

@router.post("", response_model=schemas.AppointmentResponse)
def book_appointment(
    appt: schemas.AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student_id_to_book_for = current_user.id
    
    if current_user.role == "parent":
        if not appt.student_id:
             raise HTTPException(status_code=400, detail="Student ID is required for parents")
        # Check link
        link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == current_user.id,
            models.ParentStudentLink.student_id == appt.student_id
        ).first()
        if not link:
             raise HTTPException(status_code=403, detail="You are not linked to this student")
        student_id_to_book_for = appt.student_id
    elif current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students and parents can book appointments")

    # Check if doctor accepts new patients
    doctor = db.query(models.User).filter(models.User.id == appt.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Validation: doctor accepts new patients OR already linked
    prefs = doctor.preferences or {}
    accepts_new = prefs.get('accepts_new_patients', True) # Default to true if not specified
    
    if not accepts_new:
        # Check if already linked
        linked = db.query(models.DoctorStudentRelation).filter(
            models.DoctorStudentRelation.doctor_id == appt.doctor_id,
            models.DoctorStudentRelation.student_id == student_id_to_book_for,
            models.DoctorStudentRelation.active == True
        ).first()
        if not linked:
            raise HTTPException(status_code=403, detail="Doctor is not accepting new patients")

    # Check for overlapping appointments for the doctor
    overlap = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == appt.doctor_id,
        models.Appointment.status != "cancelled",
        models.Appointment.start_time < appt.end_time,
        models.Appointment.end_time > appt.start_time
    ).first()
    
    if overlap:
         raise HTTPException(status_code=400, detail="Doctor is not available at this time")

    new_appt = models.Appointment(
        id=str(uuid.uuid4()),
        student_id=student_id_to_book_for,
        doctor_id=appt.doctor_id,
        start_time=appt.start_time,
        end_time=appt.end_time,
        status="Pending",
        notes=appt.notes
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    
    return schemas.AppointmentResponse(
        id=new_appt.id,
        student_id=new_appt.student_id,
        doctor_id=new_appt.doctor_id,
        start_time=new_appt.start_time,
        end_time=new_appt.end_time,
        status=new_appt.status,
        notes=new_appt.notes
    )

@router.get("", response_model=List[schemas.AppointmentResponse])
def get_appointments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-expire logic (similar to classes)
    current_time = datetime.utcnow()
    all_active = db.query(models.Appointment).filter(
        models.Appointment.status.in_(["Pending", "Confirmed"]),
        models.Appointment.end_time < current_time
    ).all()
    
    for appt in all_active:
        appt.status = "Completed" # Or "Missed" if we prefer, but for now "Completed" is simpler
        db.add(appt)
    
    if all_active:
        db.commit()

    query = db.query(models.Appointment)
    
    if current_user.role == "student":
        query = query.filter(models.Appointment.student_id == current_user.id)
    elif current_user.role == "doctor":
        query = query.filter(models.Appointment.doctor_id == current_user.id)
    elif current_user.role == "parent":
        links = db.query(models.ParentStudentLink).filter(models.ParentStudentLink.parent_id == current_user.id).all()
        student_ids = [link.student_id for link in links]
        query = query.filter(models.Appointment.student_id.in_(student_ids))
    # Admin sees all
        
    appts = query.all()
    results = []
    for a in appts:
        doc = db.query(models.User).filter(models.User.id == a.doctor_id).first()
        student = db.query(models.User).filter(models.User.id == a.student_id).first()
        
        results.append(schemas.AppointmentResponse(
            id=a.id,
            student_id=a.student_id,
            doctor_id=a.doctor_id,
            start_time=a.start_time,
            end_time=a.end_time,
            status=a.status,
            notes=a.notes,
            doctor_name=doc.full_name if doc else "Unknown",
            student_name=student.full_name if student else "Unknown"
        ))
    return results

@router.put("/{appt_id}")
def update_appointment(
    appt_id: str,
    appt_data: schemas.AppointmentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user.role == "student" and appt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "parent":
        link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == current_user.id,
            models.ParentStudentLink.student_id == appt.student_id
        ).first()
        if not link:
             raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role not in ["student", "parent", "admin"]:
        raise HTTPException(status_code=403, detail="Only students and parents can reschedule appointments")

    # Check for overlapping appointments for the doctor (excluding self)
    overlap = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == appt_data.doctor_id,
        models.Appointment.id != appt_id,
        models.Appointment.status != "cancelled",
        models.Appointment.start_time < appt_data.end_time,
        models.Appointment.end_time > appt_data.start_time
    ).first()
    
    if overlap:
         raise HTTPException(status_code=400, detail="Doctor is not available at this time")

    appt.doctor_id = appt_data.doctor_id
    appt.start_time = appt_data.start_time
    appt.end_time = appt_data.end_time
    if appt_data.notes is not None:
        appt.notes = appt_data.notes

    db.commit()
    return {"message": "Appointment rescheduled successfully"}

class NotesUpdate(schemas.BaseModel):
    notes: str

@router.patch("/{appt_id}/notes")
def update_appointment_notes(
    appt_id: str,
    notes_data: NotesUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    if current_user.role != "doctor" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit notes")
        
    if current_user.role == "doctor" and appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Preserve ratings if frontend doesn't send them
    import re
    old_notes = appt.notes or ""
    
    # Extract existing ratings
    ratings = re.findall(r'(\[RATING_HISTORY:.*?\]|\[RATING:.*?\])', old_notes)
    ratings_text = "\n\n".join(ratings) if ratings else ""
    
    # Strip any ratings sent unexpectedly in the update to prevent duplication
    new_clean_notes = re.sub(r'\[RATING_HISTORY:.*?\].*?(?=\n\[|$)', '', notes_data.notes, flags=re.DOTALL)
    new_clean_notes = re.sub(r'\[RATING:.*?\].*?(?=\n\[|$)', '', new_clean_notes, flags=re.DOTALL).strip()
    
    # Re-apply memory blocks
    final_notes = f"{new_clean_notes}\n\n{ratings_text}".strip() if ratings_text else new_clean_notes
    
    appt.notes = final_notes
    db.commit()
    return {"message": "Notes updated successfully", "notes": final_notes}

class RatingCreate(schemas.BaseModel):
    score: int
    feedback: str = ""

@router.post("/{appt_id}/rate")
def rate_appointment(
    appt_id: str,
    rating: RatingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    from datetime import datetime
    import re
    
    notes = appt.notes or ""
    current_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    
    # Safely archive the existing active rating if present using a non-greedy regex
    def archive_match(match):
        score_val = match.group(1)
        # fallback to current time if missing in older string format
        date_str = match.group(2) if match.group(2) else current_time
        feedback = match.group(3)
        return f"\n[RATING_HISTORY: {score_val}/5 | {date_str}] {feedback.strip()}"

    notes = re.sub(
        r'\[RATING:\s*(\d+)/5(?:.*?\|\s*([^\]]+))?\]\s*(.*?)(?=\n\[|$)', 
        archive_match, 
        notes, 
        flags=re.DOTALL
    )
    notes = notes.strip()
    
    rating_str = f"[RATING: {rating.score}/5 | {current_time}] {rating.feedback}".strip()
    appt.notes = f"{notes}\n\n{rating_str}".strip() if notes else rating_str
    
    db.commit()

    return {"message": "Rating submitted successfully"}

@router.put("/{appt_id}/status")
def update_status(
    appt_id: str,
    status: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorization logic
    if current_user.role == "doctor":
        if appt.doctor_id != current_user.id and current_user.role != "admin": # Allow admin too just in case
             raise HTTPException(status_code=403, detail="Not authorized")
    elif current_user.role == "student":
        if appt.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if status != "cancelled":
             raise HTTPException(status_code=403, detail="Students can only cancel appointments")
    elif current_user.role == "parent":
        link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == current_user.id,
            models.ParentStudentLink.student_id == appt.student_id
        ).first()
        if not link:
             raise HTTPException(status_code=403, detail="Not authorized")
        if status != "cancelled":
             raise HTTPException(status_code=403, detail="Parents can only cancel appointments")
    elif current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Not authorized")
        
    appt.status = status
    
    # -------------------------------------------------------------------------
    # 🔹 RELATIONSHIP CREATION TRIGGER
    # -------------------------------------------------------------------------
    if status == "Confirmed":
        # Check if relation already exists
        existing = db.query(models.DoctorStudentRelation).filter(
            models.DoctorStudentRelation.doctor_id == appt.doctor_id,
            models.DoctorStudentRelation.student_id == appt.student_id
        ).first()
        
        if not existing:
            new_rel = models.DoctorStudentRelation(
                id=str(uuid.uuid4()),
                doctor_id=appt.doctor_id,
                student_id=appt.student_id,
                linked_via="appointment",
                active=True
            )
            db.add(new_rel)
            
            # Audit log
            audit = models.AuditLog(
                id=str(uuid.uuid4()),
                actor_id=current_user.id,
                actor_role=current_user.role,
                action="RELATION_CREATED",
                target_type="doctor_student_relation",
                target_id=new_rel.id,
                timestamp=datetime.utcnow()
            )
            db.add(audit)
        else:
            # Re-activate if it was inactive
            if not existing.active:
                existing.active = True
                db.add(existing)

    db.commit()
    return {"message": f"Status updated to {status}"}

@router.get("/doctors", response_model=List[schemas.UserProfile])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role == "doctor").all()

@router.get("/ratings/stats")
def get_rating_stats(doctor_id: str = None, db: Session = Depends(get_db)):
    import re
    from datetime import datetime
    import statistics
    
    query = db.query(models.Appointment).filter(models.Appointment.notes.isnot(None))
    if doctor_id:
        query = query.filter(models.Appointment.doctor_id == doctor_id)
        
    appts = query.all()
    all_scores = []
    last_rating_time = None
    
    for apt in appts:
        notes = apt.notes or ""
        # Find active rating
        match = re.search(r'\[RATING:\s*(\d)/5(?:.*?\|\s*([^\]]+))?\]', notes)
        if match:
            all_scores.append(int(match.group(1)))
            date_str = match.group(2)
            if date_str:
                try:
                    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
                    if last_rating_time is None or dt > last_rating_time:
                        last_rating_time = dt
                except ValueError:
                    pass
                    
    if not all_scores:
        return {
            "total_ratings": 0,
            "average_rating": 0,
            "most_common_score": 0,
            "last_rating_time": None
        }
        
    avg_rating = sum(all_scores) / len(all_scores)
    try:
        mode_rating = statistics.mode(all_scores)
    except statistics.StatisticsError:
        mode_rating = max(set(all_scores), key=all_scores.count)
        
    return {
        "total_ratings": len(all_scores),
        "average_rating": round(avg_rating, 1),
        "most_common_score": mode_rating,
        "last_rating_time": last_rating_time.strftime("%Y-%m-%d %H:%M") if last_rating_time else None
    }

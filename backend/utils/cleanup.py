from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import models

def run_cleanup(db: Session):
    now = datetime.utcnow()
    
    # 1. Mark expired classes completed
    classes_updated = db.query(models.Classroom).filter(
        models.Classroom.status.in_(["scheduled", "live"]),
        models.Classroom.end_time < now
    ).update({"status": "completed"})
    
    # 2. Expire pending parent requests after 48h
    request_expiry = now - timedelta(hours=48)
    requests_updated = db.query(models.ParentStudentRequest).filter(
        models.ParentStudentRequest.status == "pending",
        models.ParentStudentRequest.created_at < request_expiry
    ).update({"status": "expired"})
    
    # 3. Invalidate expired sessions (last active > 24h)
    session_expiry = now - timedelta(hours=24)
    sessions_updated = db.query(models.UserSession).filter(
        models.UserSession.is_active == True,
        models.UserSession.last_active < session_expiry
    ).update({"is_active": False})
    
    # 4. Cleanup of appointments
    appts_updated = db.query(models.Appointment).filter(
        models.Appointment.status.in_(["Pending", "Confirmed"]),
        models.Appointment.end_time < now
    ).update({"status": "Completed"})
    
    db.commit()
    return {
        "classes": classes_updated,
        "requests": requests_updated,
        "sessions": sessions_updated,
        "appointments": appts_updated
    }

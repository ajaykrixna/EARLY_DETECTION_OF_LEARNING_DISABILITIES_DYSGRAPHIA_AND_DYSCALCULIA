from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime
import models, schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])

@router.post("", response_model=schemas.MessageResponse)
def send_message(
    msg: schemas.MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    receiver = db.query(models.User).filter(models.User.id == msg.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Relational Validation
    if current_user.role == "parent" and receiver.role == "teacher":
        if not msg.student_id:
            raise HTTPException(status_code=400, detail="student_id required for parent-teacher messaging")
        # Check if parent is linked to student
        link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == current_user.id,
            models.ParentStudentLink.student_id == msg.student_id
        ).first()
        if not link:
            raise HTTPException(status_code=403, detail="You are not linked to this student")
        
        # Check if teacher is linked to student? (Not strictly required for first contact, but good)
    elif current_user.role == "teacher" and receiver.role == "parent":
         if not msg.student_id:
            raise HTTPException(status_code=400, detail="student_id context required")
         # Teacher can reply to parent of their student
         link = db.query(models.ParentStudentLink).filter(
            models.ParentStudentLink.parent_id == receiver.id,
            models.ParentStudentLink.student_id == msg.student_id
         ).first()
         if not link:
             raise HTTPException(status_code=403, detail="Receiver parent is not linked to the specified student")
    else:
        # Generic role check for other pairs if needed
        pass

    new_msg = models.Message(
        id=str(uuid.uuid4()),
        sender_id=current_user.id,
        receiver_id=msg.receiver_id,
        sender_role=current_user.role,
        receiver_role=receiver.role,
        student_id=msg.student_id,
        content=msg.content,
        timestamp=datetime.utcnow(),
        created_by=current_user.id
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("", response_model=List[schemas.MessageResponse])
def get_messages(
    student_id: str = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Message).filter(
        (models.Message.sender_id == current_user.id) | 
        (models.Message.receiver_id == current_user.id)
    )
    if student_id:
        query = query.filter(models.Message.student_id == student_id)
    
    messages = query.order_by(models.Message.timestamp.desc()).all()
    
    results = []
    for m in messages:
        sender = db.query(models.User).filter(models.User.id == m.sender_id).first()
        results.append(schemas.MessageResponse(
            id=m.id,
            sender_id=m.sender_id,
            receiver_id=m.receiver_id,
            sender_role=m.sender_role,
            receiver_role=m.receiver_role,
            student_id=m.student_id,
            content=m.content,
            timestamp=m.timestamp,
            is_read=m.is_read,
            sender_name=sender.full_name if sender else "Unknown"
        ))
    return results

@router.put("/{message_id}/read")
def mark_as_read(
    message_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(models.Message).filter(models.Message.id == message_id, models.Message.receiver_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True
    db.commit()
    return {"status": "success"}

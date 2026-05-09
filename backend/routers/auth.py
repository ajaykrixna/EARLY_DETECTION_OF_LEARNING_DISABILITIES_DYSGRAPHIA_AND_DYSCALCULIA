from fastapi import APIRouter, Depends, HTTPException, status, Request
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uuid
import schemas
import models
from database import get_db
from services.auth_service import AuthService
from typing import List

router = APIRouter(prefix="/api/auth", tags=["Auth"])
auth_service = AuthService()

# Helper for session creation
def create_session(db: Session, user_id: str, token: str, request: Request):
    new_session = models.UserSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token=token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host,
        created_at=datetime.utcnow(),
        last_active=datetime.utcnow()
    )
    db.add(new_session)
    db.commit()
    return new_session

@router.post("/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth_service.get_password_hash(user.password)
    new_user = models.User(
        id=str(uuid.uuid4()),
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        age=user.age,
        language_preference=user.language_preference,
        notifications={},
        accessibility={},
        preferences={}
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth_service.create_access_token(data={"sub": new_user.email})
    create_session(db, new_user.id, access_token, request)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login")
def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # Check Lockout
    if user and user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(status_code=403, detail=f"Account locked. Try again after {user.locked_until}")

    if not user or not auth_service.verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                user.failed_login_attempts = 0
            db.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Success reset failed attempts
    user.failed_login_attempts = 0
    db.commit()

    if user.two_factor_enabled:
        otp = None
        # Prevent immediate regeneration if a valid OTP already exists (idempotency window 30s)
        if user.otp_secret and user.otp_expiry and (user.otp_expiry - datetime.utcnow()).total_seconds() > 270:
             # Skip regeneration
             pass
        else:
            # Generate new OTP
            otp = auth_service.generate_otp()
            user.otp_secret = auth_service.hash_otp(otp)
            user.otp_expiry = datetime.utcnow() + timedelta(seconds=300) # 5 minutes
            user.otp_attempts = 0
            db.commit()
            print(f"\n[SECURITY] 2FA OTP for {user.email}: {otp}\n")
            
        return {
            "require_2fa": True, 
            "user_id": user.id,
            "otp_debug": otp # Force for testing convenience as requested
        }
    
    access_token = auth_service.create_access_token(data={"sub": user.email})
    create_session(db, user.id, access_token, request)
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordBearer
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

@router.post("/2fa/verify")
def verify_2fa(
    request: Request, 
    verify_data: schemas.TPANVerifyRequest, 
    user_id: str = None, 
    db: Session = Depends(get_db),
    token: str = Depends(optional_oauth2_scheme)
):
    user = None
    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
    elif token:
        # Get from token
        from jose import jwt
        from services.auth_service import SECRET_KEY, ALGORITHM
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email:
                user = db.query(models.User).filter(models.User.email == email).first()
        except:
            pass

    if not user:
         raise HTTPException(status_code=404, detail="User context lost or token invalid")

    if not user.otp_secret or not user.otp_expiry or user.otp_expiry < datetime.utcnow():
        # Clean up stale OTP data
        user.otp_secret = None
        user.otp_expiry = None
        user.otp_attempts = 0
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired or not generated")

    if user.otp_attempts >= 5:
        user.otp_secret = None
        user.otp_expiry = None
        db.commit()
        raise HTTPException(status_code=403, detail="Max OTP attempts reached. Please login again.")

    if not auth_service.verify_otp(verify_data.otp, user.otp_secret):
        user.otp_attempts += 1
        db.commit()
        print(f"[AUTH] Failed OTP attempt for {user.email}. Attempt: {user.otp_attempts}")
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {5 - user.otp_attempts} attempts remaining.")

    # Success
    user.otp_secret = None
    user.otp_expiry = None
    user.otp_attempts = 0
    user.failed_login_attempts = 0 # Also reset login failures
    db.commit()

    access_token = auth_service.create_access_token(data={"sub": user.email})
    create_session(db, user.id, access_token, request)
    return {"access_token": access_token, "token_type": "bearer"}

from dependencies import get_current_user, oauth2_scheme

@router.post("/2fa/setup", response_model=schemas.TPANSetupResponse)
def setup_2fa(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    otp = auth_service.generate_otp()
    recovery_codes = auth_service.generate_recovery_codes(5)
    
    current_user.otp_secret = auth_service.hash_otp(otp)
    current_user.otp_expiry = datetime.utcnow() + timedelta(seconds=120) # 2 mins for setup
    current_user.otp_attempts = 0
    # Store hashed recovery codes
    current_user.recovery_codes = [auth_service.get_password_hash(c) for c in recovery_codes]
    
    db.commit()
    
    return {
        "message": "OTP generated and recovery codes issued. SAVE THESE CODES.",
        "otp": otp,
        "recovery_codes": recovery_codes
    }

@router.post("/2fa/recover")
def verify_recovery(
    request: Request,
    verify_data: schemas.TPANVerifyRequest, # Reusing otp field for code
    user_id: str,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or not user.two_factor_enabled:
        raise HTTPException(status_code=404, detail="User context lost or 2FA not enabled")

    # Check recovery codes
    matching_code_index = -1
    for i, hashed_code in enumerate(user.recovery_codes):
        if auth_service.verify_password(verify_data.otp, hashed_code):
            matching_code_index = i
            break
    
    if matching_code_index == -1:
        raise HTTPException(status_code=400, detail="Invalid recovery code")

    # Consume the code
    codes = list(user.recovery_codes)
    codes.pop(matching_code_index)
    user.recovery_codes = codes
    db.commit()

    # Success - log them in
    access_token = auth_service.create_access_token(data={"sub": user.email})
    create_session(db, user.id, access_token, request)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/2fa/toggle")
def toggle_2fa(enabled: bool, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.two_factor_enabled = enabled
    db.commit()
    return {"two_factor_enabled": current_user.two_factor_enabled}

@router.get("/me", response_model=schemas.UserProfile)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    # Ensure JSON fields are not None
    current_user.notifications = current_user.notifications if current_user.notifications is not None else {}
    current_user.accessibility = current_user.accessibility if current_user.accessibility is not None else {}
    current_user.preferences = current_user.preferences if current_user.preferences is not None else {}
    return current_user

from routers.websockets import notification_manager
import asyncio

@router.put("/me", response_model=schemas.UserProfile)
async def update_user_me(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None: current_user.full_name = user_update.full_name
    if user_update.age is not None: current_user.age = user_update.age
    if user_update.role is not None: current_user.role = user_update.role
    if user_update.language_preference is not None: current_user.language_preference = user_update.language_preference
    if user_update.password: current_user.hashed_password = auth_service.get_password_hash(user_update.password)
    
    if user_update.notifications is not None: current_user.notifications = user_update.notifications
    if user_update.accessibility is not None: current_user.accessibility = user_update.accessibility
    if user_update.preferences is not None: current_user.preferences = user_update.preferences
    
    # Send a real-time push notification over custom WebSocket on ANY save
    try:
        await notification_manager.send_personal_notification(
            {
                "type": "push_alert",
                "title": "System Synchronization",
                "message": "Your profile preferences were synced over our native WebSocket layer."
            },
            current_user.id
        )
    except Exception as e:
        print(f"Failed to send real-time push: {e}")
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Session Management
@router.get("/sessions", response_model=List[schemas.SessionResponse])
def get_sessions(token: str = Depends(oauth2_scheme), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.UserSession).filter(models.UserSession.user_id == current_user.id, models.UserSession.is_active == True).all()
    res = []
    for s in sessions:
        res.append(schemas.SessionResponse(
            id=s.id,
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            last_active=s.last_active,
            is_current=(s.token == token)
        ))
    return res

@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id, models.UserSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.is_active = False
    db.commit()
    return {"message": "Session revoked"}

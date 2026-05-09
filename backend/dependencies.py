from fastapi import Depends, HTTPException, status
from datetime import datetime
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import AuthService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
auth_service = AuthService()

from fastapi import Request

def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Session validation with device pinning
    session = db.query(models.UserSession).filter(
        models.UserSession.token == token,
        models.UserSession.is_active == True
    ).first()
    
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or logged out")
    
    # Verify fingerprint (IP + UA)
    current_ip = request.client.host if request.client else "unknown"
    current_ua = request.headers.get("user-agent", "unknown")
    
    if session.ip_address != current_ip or session.user_agent != current_ua:
        # Detected mismatch - possible session hijack
        session.is_active = False
        db.commit()
        raise HTTPException(status_code=401, detail="Security mismatch detected. Session terminated.")
    
    session.last_active = datetime.utcnow()
    db.commit()

    return user

# Central Permission Engine Middleware
class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: models.User = Depends(get_current_user)):
        if "admin" in self.allowed_roles and user.role == "admin":
            return user
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted: Insufficient role permissions"
            )
        return user

def require_role(roles: list):
    return RoleChecker(roles)


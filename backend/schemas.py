from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str = "student"
    age: Optional[int] = None
    language_preference: str = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    role: Optional[str] = None
    language_preference: Optional[str] = None
    password: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None
    accessibility: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None

class UserProfile(UserBase):
    id: str
    role: str
    language_preference: str
    age: Optional[int] = None
    avatar_url: Optional[str] = None # New field
    notifications: Dict[str, Any] = {}
    accessibility: Dict[str, Any] = {}
    preferences: Dict[str, Any] = {}
    two_factor_enabled: bool = False
    created_at: datetime
    
    @field_validator('notifications', 'accessibility', 'preferences', mode='before')
    @classmethod
    def ensure_dict(cls, v):
        return v if v is not None else {}

    class Config:
        from_attributes = True
        alias_generator = None # Ensure stability

class StudentSummary(UserProfile):
    dysgraphia_risk: Optional[str] = "Unknown"
    dyscalculia_risk: Optional[str] = "Unknown"

# Recommendation Schemas
class RecommendationCreate(BaseModel):
    student_id: str
    content: str

class RecommendationResponse(BaseModel):
    id: str
    student_id: str
    doctor_id: str
    content: str
    is_read: bool = False
    is_important: bool = False
    is_archived: bool = False
    reply_text: Optional[str] = None
    created_at: datetime
    doctor_name: Optional[str] = None

class RecommendationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_important: Optional[bool] = None
    is_archived: Optional[bool] = None
    reply_text: Optional[str] = None

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str

# Classroom Schemas
class ClassroomCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime

class ClassroomResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    teacher_id: str
    start_time: datetime
    end_time: datetime
    status: str
    teacher_name: Optional[str] = None
    student_ids: List[str] = []

    class Config:
        from_attributes = True

class TeacherRiskAnalytics(BaseModel):
    dysgraphia: Dict[str, int]
    dyscalculia: Dict[str, int]
    total_students: int

# Appointment Schemas
class AppointmentCreate(BaseModel):
    doctor_id: str
    student_id: Optional[str] = None
    start_time: datetime
    end_time: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    doctor_id: str
    student_id: str
    start_time: datetime
    end_time: datetime
    status: str
    notes: Optional[str] = None
    doctor_name: Optional[str] = None
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# Session & 2FA Schemas
class SessionResponse(BaseModel):
    id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    last_active: datetime
    is_current: bool = False

    class Config:
        from_attributes = True

class TPANSetupResponse(BaseModel):
    otp: str # For dev/demo
    recovery_codes: List[str]
    message: str

class TPANVerifyRequest(BaseModel):
    otp: str

# Doctor-Student Relational Schemas
class TreatmentPlanBase(BaseModel):
    student_id: str
    content: Dict[str, Any]
    status: str = "Active"

class TreatmentPlanCreate(TreatmentPlanBase):
    pass

class TreatmentPlanResponse(TreatmentPlanBase):
    id: str
    doctor_id: str
    created_at: datetime
    updated_at: datetime
    created_by: str

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: str
    actor_id: str
    actor_role: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    student_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    sender_role: str
    receiver_role: str
    student_id: Optional[str] = None
    content: str
    timestamp: datetime
    is_read: bool = False
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True

class ParentStudentRequestResponse(BaseModel):
    id: str
    parent_id: str
    student_email: str
    status: str
    created_at: datetime
    parent_name: Optional[str] = None

    class Config:
        from_attributes = True

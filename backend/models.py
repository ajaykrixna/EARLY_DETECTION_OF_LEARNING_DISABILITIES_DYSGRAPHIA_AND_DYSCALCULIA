from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # UUID
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default="student")
    language_preference = Column(String, default="en")
    age = Column(Integer, nullable=True)
    avatar_url = Column(String, nullable=True)
    preferences = Column(JSON, default={})
    accessibility = Column(JSON, default={})
    notifications = Column(JSON, default={})
    
    # 2FA & Security logic
    two_factor_enabled = Column(Boolean, default=False)
    otp_secret = Column(String, nullable=True) # Hashed OTP or Secret
    otp_expiry = Column(DateTime, nullable=True)
    otp_attempts = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    recovery_codes = Column(JSON, default=[]) # List of hashed recovery codes

    created_at = Column(DateTime, default=datetime.utcnow)

    dysgraphia_tests = relationship("DysgraphiaTest", back_populates="owner")
    dyscalculia_tests = relationship("DyscalculiaTest", back_populates="owner")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    token = Column(String, unique=True, index=True)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class DysgraphiaTest(Base):
    __tablename__ = "dysgraphia_tests"

    id = Column(String, primary_key=True, index=True) # UUID
    user_id = Column(String, ForeignKey("users.id"))
    image_url = Column(String)
    prediction_class = Column(String)
    confidence_score = Column(Float)
    gradcam_url = Column(String, nullable=True)
    model_version = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="dysgraphia_tests")


class DyscalculiaTest(Base):
    __tablename__ = "dyscalculia_tests"

    id = Column(String, primary_key=True, index=True) # UUID
    user_id = Column(String, ForeignKey("users.id"))
    quiz_responses = Column(JSON)
    prediction_class = Column(String)
    confidence_score = Column(Float)
    feature_importance = Column(JSON)
    model_version = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="dyscalculia_tests")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, index=True) # UUID
    student_id = Column(String, ForeignKey("users.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    content = Column(String)
    is_read = Column(Boolean, default=False)
    is_important = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    reply_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="recommendations_received")
    doctor = relationship("User", foreign_keys=[doctor_id], backref="recommendations_given")


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String)
    teacher_id = Column(String, ForeignKey("users.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="Scheduled") # Scheduled, Live, Completed, Cancelled
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("User", backref="classes_taught")
    student_ids = Column(JSON, default=[]) # List of involved student IDs
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String) # Teacher ID


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True) # UUID
    doctor_id = Column(String, ForeignKey("users.id"))
    student_id = Column(String, ForeignKey("users.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="Pending") # Pending, Confirmed, Completed, Cancelled
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    doctor = relationship("User", foreign_keys=[doctor_id], backref="appointments_as_doctor")
    student = relationship("User", foreign_keys=[student_id], backref="appointments_as_student")


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    id = Column(String, primary_key=True, index=True) # UUID
    parent_id = Column(String, ForeignKey("users.id"))
    student_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("User", foreign_keys=[parent_id], backref="children_links")
    student = relationship("User", foreign_keys=[student_id], backref="parent_links")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)

class ParentStudentRequest(Base):
    __tablename__ = "parent_student_requests"

    id = Column(String, primary_key=True, index=True)
    parent_id = Column(String, ForeignKey("users.id"))
    student_email = Column(String)
    status = Column(String, default="pending") # pending, approved, rejected, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)

class TeacherStudentRelation(Base):
    __tablename__ = "teacher_student_relations"

    id = Column(String, primary_key=True, index=True)
    teacher_id = Column(String, ForeignKey("users.id"))
    student_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    sender_id = Column(String, ForeignKey("users.id"))
    receiver_id = Column(String, ForeignKey("users.id"))
    sender_role = Column(String)
    receiver_role = Column(String)
    student_id = Column(String, ForeignKey("users.id"), nullable=True)
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String)

class DoctorStudentRelation(Base):
    __tablename__ = "doctor_student_relations"

    id = Column(String, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("users.id"))
    student_id = Column(String, ForeignKey("users.id"))
    linked_via = Column(String, default="appointment")
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=True)

class TreatmentPlan(Base):
    __tablename__ = "treatment_plans"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    content = Column(JSON)
    status = Column(String, default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String) # Doctor ID

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    actor_id = Column(String, ForeignKey("users.id"))
    actor_role = Column(String)
    action = Column(String)
    target_type = Column(String)
    target_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String, nullable=True)

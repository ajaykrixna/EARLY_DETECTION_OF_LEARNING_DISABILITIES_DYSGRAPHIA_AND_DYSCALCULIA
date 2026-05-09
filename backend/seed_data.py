import sys
import os
import uuid
import sys

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from database import engine, SessionLocal, Base
import models
from services.auth_service import AuthService

# Initialize
db = SessionLocal()
auth_service = AuthService()

def create_user(email, password, full_name, role, age=25):
    # Check if exists
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        print(f"User {email} already exists. Skipping.")
        return

    hashed_password = auth_service.get_password_hash(password)
    
    new_user = models.User(
        id=str(uuid.uuid4()),
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role=role,
        language_preference="en",
        age=age
    )
    
    db.add(new_user)
    try:
        db.commit()
        print(f"Created {role}: {email} / {password}")
    except Exception as e:
        db.rollback()
        print(f"Error creating {email}: {e}")

def seed_data():
    print("Seeding data...")
    
    # 1. Admin
    create_user("aswinprakash.lad23@jecc.ac.in", "admin", "Aswin Admin", "admin", 23)
    
    # 2. Teacher
    create_user("teacher@gmail.com", "teacher", "Aswin Teacher", "teacher", 30)
    
    # 3. Doctor
    create_user("doctor@gmail.com", "doctor", "Aswin Doctor", "doctor", 35)
    
    # 4. Student
    create_user("aswinputhiyaparambil@gmail.com", "student", "Aswin Student", "student", 12)

    print("Seeding complete.")

if __name__ == "__main__":
    seed_data()

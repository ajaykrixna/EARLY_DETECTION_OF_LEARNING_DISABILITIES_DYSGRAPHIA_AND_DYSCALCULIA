import sys
import os
sys.path.append(os.getcwd())
from database import SessionLocal
import models

db = SessionLocal()
print("Checking users...")
users = db.query(models.User).all()

expected_emails = [
    "aswinprakash.lad23@jecc.ac.in",
    "teacher@gmail.com",
    "doctor@gmail.com",
    "aswinputhiyaparambil@gmail.com"
]

found_emails = [u.email for u in users]
match = True

print(f"Total Users Found: {len(users)}")
for u in users:
    print(f" - {u.email} ({u.role})")
    
for email in expected_emails:
    if email not in found_emails:
        print(f"MISSING: {email}")
        match = False

if match:
    print("SUCCESS: All requested users are present.")
else:
    print("FAILURE: Some users are missing.")

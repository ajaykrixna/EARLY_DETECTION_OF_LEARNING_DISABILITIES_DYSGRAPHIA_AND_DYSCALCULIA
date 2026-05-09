from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import os
import random
import string

# Securely get secret from env or use a fallback for local dev
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

class AuthService:
    def verify_password(self, plain_password, hashed_password):
        if not hashed_password: return False
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        try:
            return bcrypt.checkpw(plain_password, hashed_password)
        except:
            return False

    def get_password_hash(self, password):
        if isinstance(password, str):
            password = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password, salt)
        return hashed.decode('utf-8')

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        # Add a unique jitter to token to ensure session uniqueness if multiple tokens created at same sec
        to_encode.update({"jti": "".join(random.choices(string.ascii_letters + string.digits, k=16))})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_token(self, token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

    # 2FA Logic
    def generate_otp(self) -> str:
        """Generate a random 6-digit OTP."""
        return "".join(random.choices(string.digits, k=6))

    def hash_otp(self, otp: str) -> str:
        return self.get_password_hash(otp)

    def verify_otp(self, plain_otp: str, hashed_otp: str) -> bool:
        return self.verify_password(plain_otp, hashed_otp)

    def generate_recovery_codes(self, count: int = 5) -> list:
        """Generate a list of random recovery codes."""
        codes = []
        for _ in range(count):
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=10))
            codes.append(code)
        return codes

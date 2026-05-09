from database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('users')]
print(f"User columns: {columns}")

if 'avatar_url' in columns:
    print("avatar_url column exists.")
else:
    print("avatar_url column MISSING.")

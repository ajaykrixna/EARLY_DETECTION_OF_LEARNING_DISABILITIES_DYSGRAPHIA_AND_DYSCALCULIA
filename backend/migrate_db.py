from database import engine, Base
from sqlalchemy import text
import models

def migrate():
    with engine.connect() as conn:
        # 1. User Table Columns
        result = conn.execute(text("PRAGMA table_info(users)"))
        columns = [row[1] for row in result.fetchall()]
        
        needed_cols = {
            'avatar_url': 'VARCHAR',
            'preferences': "JSON DEFAULT '{}'",
            'accessibility': "JSON DEFAULT '{}'",
            'notifications': "JSON DEFAULT '{}'",
            'two_factor_enabled': "BOOLEAN DEFAULT 0",
            'otp_secret': "VARCHAR",
            'otp_expiry': "DATETIME",
            'otp_attempts': "INTEGER DEFAULT 0",
            'failed_login_attempts': "INTEGER DEFAULT 0",
            'locked_until': "DATETIME"
        }

        for col, col_type in needed_cols.items():
            if col not in columns:
                print(f"Adding {col} column to users table...")
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                conn.commit()

        # 2. Recreate UserSessions Table to ensure column alignment
        print("Ensuring user_sessions table is correctly structured...")
        conn.execute(text("DROP TABLE IF EXISTS user_sessions"))
        conn.execute(text("""
            CREATE TABLE user_sessions (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR,
                token VARCHAR UNIQUE,
                user_agent VARCHAR,
                ip_address VARCHAR,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME,
                last_active DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """))
        conn.commit()

        # 3. Create relational tables if they don't exist
        print("Ensuring clinical relational tables exist...")
        conn.execute(text("DROP TABLE IF EXISTS doctor_student_assignments"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS doctor_student_relations (
                id VARCHAR PRIMARY KEY,
                doctor_id VARCHAR,
                student_id VARCHAR,
                linked_via VARCHAR DEFAULT 'appointment',
                created_at DATETIME,
                active BOOLEAN DEFAULT 1,
                FOREIGN KEY(doctor_id) REFERENCES users(id),
                FOREIGN KEY(student_id) REFERENCES users(id),
                UNIQUE(doctor_id, student_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS treatment_plans (
                id VARCHAR PRIMARY KEY,
                student_id VARCHAR,
                doctor_id VARCHAR,
                content JSON,
                status VARCHAR DEFAULT 'Active',
                created_at DATETIME,
                updated_at DATETIME,
                created_by VARCHAR,
                FOREIGN KEY(student_id) REFERENCES users(id),
                FOREIGN KEY(doctor_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR PRIMARY KEY,
                actor_id VARCHAR,
                actor_role VARCHAR,
                action VARCHAR,
                target_type VARCHAR,
                target_id VARCHAR,
                timestamp DATETIME,
                ip_address VARCHAR,
                FOREIGN KEY(actor_id) REFERENCES users(id)
            )
        """))

        # 4. Teacher and Parent relates
        print("Ensuring educational and communication tables exist...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id VARCHAR PRIMARY KEY,
                sender_id VARCHAR,
                receiver_id VARCHAR,
                sender_role VARCHAR,
                receiver_role VARCHAR,
                student_id VARCHAR,
                content TEXT,
                timestamp DATETIME,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME,
                updated_at DATETIME,
                created_by VARCHAR,
                FOREIGN KEY(sender_id) REFERENCES users(id),
                FOREIGN KEY(receiver_id) REFERENCES users(id),
                FOREIGN KEY(student_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS parent_student_requests (
                id VARCHAR PRIMARY KEY,
                parent_id VARCHAR,
                student_email VARCHAR,
                status VARCHAR DEFAULT 'pending',
                created_at DATETIME,
                updated_at DATETIME,
                created_by VARCHAR,
                FOREIGN KEY(parent_id) REFERENCES users(id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS teacher_student_relations (
                id VARCHAR PRIMARY KEY,
                teacher_id VARCHAR,
                student_id VARCHAR,
                created_at DATETIME,
                updated_at DATETIME,
                created_by VARCHAR,
                FOREIGN KEY(teacher_id) REFERENCES users(id),
                FOREIGN KEY(student_id) REFERENCES users(id),
                UNIQUE(teacher_id, student_id)
            )
        """))

        # 5. Schema checks for classrooms and parent_student_links
        res = conn.execute(text("PRAGMA table_info(classrooms)"))
        cols = [r[1] for r in res.fetchall()]
        if 'student_ids' not in cols:
            conn.execute(text("ALTER TABLE classrooms ADD COLUMN student_ids JSON DEFAULT '[]'"))
        if 'updated_at' not in cols:
            conn.execute(text("ALTER TABLE classrooms ADD COLUMN updated_at DATETIME"))
        if 'created_by' not in cols:
            conn.execute(text("ALTER TABLE classrooms ADD COLUMN created_by VARCHAR"))

        res = conn.execute(text("PRAGMA table_info(parent_student_links)"))
        cols = [r[1] for r in res.fetchall()]
        if 'updated_at' not in cols:
            conn.execute(text("ALTER TABLE parent_student_links ADD COLUMN updated_at DATETIME"))
        if 'created_by' not in cols:
            conn.execute(text("ALTER TABLE parent_student_links ADD COLUMN created_by VARCHAR"))

        conn.commit()
            
        print("Migration complete.")

if __name__ == "__main__":
    migrate()

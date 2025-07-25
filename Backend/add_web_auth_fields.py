"""
Migration script to add web authentication fields to the User table
Run this script to update the database schema for web authentication support
"""

from app import create_app
from app.extensions import db
from sqlalchemy import text

def add_web_auth_fields():
    app = create_app()
    
    with app.app_context():
        try:
            # Add new columns for web authentication
            with db.engine.connect() as connection:
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS username VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS bio TEXT,
                    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS interests TEXT,
                    ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
                    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
                    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                """))
                
                # Make phone_number nullable since web users might not have phone numbers
                connection.execute(text("""
                    ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;
                """))
                
                # Add unique constraints separately
                try:
                    connection.execute(text("""
                        ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
                    """))
                except Exception:
                    pass  # Constraint might already exist
                
                try:
                    connection.execute(text("""
                        ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
                    """))
                except Exception:
                    pass  # Constraint might already exist
                
                connection.commit()
            
            print("✅ Successfully added web authentication fields to users table")
            
        except Exception as e:
            print(f"❌ Error adding web authentication fields: {str(e)}")
            print("This might be because the fields already exist or there's a database connection issue.")

if __name__ == "__main__":
    add_web_auth_fields()
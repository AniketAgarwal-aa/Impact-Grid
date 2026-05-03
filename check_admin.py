from backend.app.database import SessionLocal
from backend.app.models import User

def check():
    db = SessionLocal()
    admin = db.query(User).filter(User.email == "aniketagarwal359@gmail.com").first()
    print("Admin found:" if admin else "Admin NOT found")
    if admin:
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role}")

if __name__ == "__main__":
    check()

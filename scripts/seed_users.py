import os
import sys
from werkzeug.security import generate_password_hash

# Allow running as script from repo root or scripts/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from backend.db import init_db, get_user_by_username, create_user  # noqa: E402

INPUT_DIR = os.environ.get("INPUT_DIR", os.path.join(BASE_DIR, "input"))
DEFAULT_ADMIN_USER = os.environ.get("ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASS = os.environ.get("ADMIN_PASSWORD", "ChangeMeNow!")

def ensure_admin():
    if not get_user_by_username(DEFAULT_ADMIN_USER):
        print(f"Creating admin user '{DEFAULT_ADMIN_USER}'")
        create_user(DEFAULT_ADMIN_USER, generate_password_hash(DEFAULT_ADMIN_PASS), "admin")
    else:
        print("Admin user already exists")


def seed_participants(default_password: str = None):
    pwd = default_password or os.environ.get("DEFAULT_USER_PASSWORD", "password123")
    if not os.path.isdir(INPUT_DIR):
        print(f"Input directory missing: {INPUT_DIR}")
        return
    participants = [d for d in os.listdir(INPUT_DIR) if d.startswith("participant-") and os.path.isdir(os.path.join(INPUT_DIR, d))]
    participants.sort()
    print(f"Discovered participants: {participants}")
    for p in participants:
        username = p  # username equals participant id
        if get_user_by_username(username):
            print(f"User {username} exists, skipping")
            continue
        print(f"Creating user {username} mapped to participant {p}")
        create_user(username, generate_password_hash(pwd), p)


def main():
    init_db()
    ensure_admin()
    seed_participants()
    print("Seeding complete.")

if __name__ == "__main__":
    main()

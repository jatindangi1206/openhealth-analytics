import os
import sqlite3
from contextlib import closing

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "app.db"))
DB_PATH = os.environ.get("DB_PATH", DEFAULT_DB_PATH)


def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                participant_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.commit()


def create_user(username: str, password_hash: str, participant_id: str):
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password_hash, participant_id) VALUES (?, ?, ?)",
            (username, password_hash, participant_id),
        )
        conn.commit()


def get_user_by_username(username: str):
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        return dict(row) if row else None


def list_users():
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, username, participant_id, created_at FROM users ORDER BY id ASC")
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def update_password_hash(username: str, new_password_hash: str):
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET password_hash = ? WHERE username = ?",
            (new_password_hash, username),
        )
        conn.commit()
        return cur.rowcount


def delete_user(username: str):
    with closing(get_connection()) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM users WHERE username = ?", (username,))
        conn.commit()
        return cur.rowcount

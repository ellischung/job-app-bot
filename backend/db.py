import sqlite3
from datetime import datetime

DB_PATH = "job_applications.db"

def init_db():
    """Initialize the SQLite database and create the table if it doesn't exist."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS applied_jobs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT,
        job_title   TEXT,
        company     TEXT,
        job_url     TEXT,
        status      TEXT
    )
    """)
    conn.commit()
    conn.close()

def already_applied(job_url: str) -> bool:
    """Return True if we've already recorded this job_url."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM applied_jobs WHERE job_url = ?", (job_url,))
    count = c.fetchone()[0]
    conn.close()
    return count > 0

def log_application(job_title: str, company: str, job_url: str, status: str):
    """Insert a new application record."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
    INSERT INTO applied_jobs (timestamp, job_title, company, job_url, status)
    VALUES (?, ?, ?, ?, ?)
    """, (
        datetime.now().isoformat(),
        job_title,
        company,
        job_url,
        status
    ))
    conn.commit()
    conn.close()

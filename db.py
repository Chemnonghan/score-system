import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "scores.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            number INTEGER NOT NULL,
            full_name TEXT NOT NULL,
            UNIQUE(class_name, number)
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            full_score REAL NOT NULL DEFAULT 100
        );

        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
            score REAL NOT NULL,
            UNIQUE(student_id, subject_id)
        );
        """
    )
    conn.commit()
    migrate_schema(conn)
    conn.close()


def migrate_schema(conn):
    """Add scores.full_score if missing (older databases only had a single,
    shared full_score per subject NAME on the subjects table — which broke
    once two classes used the same subject name with different max scores,
    e.g. ม.6 "กลางภาค" = 20 vs ม.1 "กลางภาค" = 30). Full score now lives on
    each individual score entry so different classes never clash."""
    cols = [row["name"] for row in conn.execute("PRAGMA table_info(scores)").fetchall()]
    if "full_score" not in cols:
        conn.execute("ALTER TABLE scores ADD COLUMN full_score REAL NOT NULL DEFAULT 100")
        # backfill from the old shared subjects.full_score so nothing is lost;
        # re-importing each class's file afterwards will correct any values
        # that were previously overwritten by a different class's import
        conn.execute(
            """
            UPDATE scores
            SET full_score = (
                SELECT full_score FROM subjects WHERE subjects.id = scores.subject_id
            )
            """
        )
        conn.commit()


if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)

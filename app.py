import os

from flask import Flask, jsonify, request, render_template
from db import get_conn, init_db

app = Flask(__name__)
init_db()  # ensure tables exist as soon as the app module is imported (needed when run via gunicorn/waitress)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/classes")
def api_classes():
    conn = get_conn()
    rows = conn.execute(
        "SELECT DISTINCT class_name FROM students ORDER BY class_name"
    ).fetchall()
    conn.close()
    return jsonify([r["class_name"] for r in rows])


@app.route("/api/search")
def api_search():
    class_name = (request.args.get("class_name") or "").strip()
    number = (request.args.get("number") or "").strip()
    name = (request.args.get("name") or "").strip()

    if not class_name or (not number and not name):
        return jsonify({"found": False, "message": "กรุณาระบุชั้นเรียน และเลขที่หรือชื่อ-สกุล"}), 400

    conn = get_conn()

    if number:
        try:
            number_int = int(number)
        except ValueError:
            conn.close()
            return jsonify({"found": False, "message": "เลขที่ต้องเป็นตัวเลข"}), 400

        student = conn.execute(
            "SELECT id, class_name, number, full_name FROM students WHERE class_name=? AND number=?",
            (class_name, number_int),
        ).fetchone()
    else:
        matches = conn.execute(
            "SELECT id, class_name, number, full_name FROM students "
            "WHERE class_name=? AND full_name LIKE ? ORDER BY number",
            (class_name, f"%{name}%"),
        ).fetchall()

        if len(matches) == 0:
            student = None
        elif len(matches) == 1:
            student = matches[0]
        else:
            conn.close()
            return jsonify(
                {
                    "found": False,
                    "multiple": True,
                    "message": "พบชื่อที่คล้ายกันหลายคน กรุณาเลือกหรือระบุเลขที่แทน",
                    "matches": [
                        {"number": m["number"], "full_name": m["full_name"]} for m in matches
                    ],
                }
            ), 409

    if not student:
        conn.close()
        return jsonify({"found": False, "message": "ไม่พบข้อมูลนักเรียน กรุณาตรวจสอบชั้นเรียน เลขที่ หรือชื่อ-สกุลอีกครั้ง"}), 404

    score_rows = conn.execute(
        """
        SELECT sub.name AS subject, sub.full_score AS full_score, sc.score AS score
        FROM scores sc
        JOIN subjects sub ON sub.id = sc.subject_id
        WHERE sc.student_id = ?
        ORDER BY sub.id
        """,
        (student["id"],),
    ).fetchall()
    conn.close()

    subjects = [
        {"subject": r["subject"], "score": r["score"], "full_score": r["full_score"]}
        for r in score_rows
    ]

    total_score = sum(s["score"] for s in subjects)
    total_full = sum(s["full_score"] for s in subjects)
    percent = round((total_score / total_full) * 100, 2) if total_full else 0

    return jsonify(
        {
            "found": True,
            "student": {
                "class_name": student["class_name"],
                "number": student["number"],
                "full_name": student["full_name"],
            },
            "subjects": subjects,
            "summary": {
                "total_score": total_score,
                "total_full": total_full,
                "percent": percent,
            },
        }
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)

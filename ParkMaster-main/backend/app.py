import os
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory

try:
    from flask_cors import CORS
except ImportError:
    CORS = None


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ROOT_ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FRONTEND_ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")
DB_PATH = os.path.join(BACKEND_DIR, "parking.db")

app = Flask(__name__, static_folder=None)

if CORS:
    CORS(app)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


def init_database():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL,
            student_code TEXT,
            balance INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS parking_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_key TEXT UNIQUE NOT NULL,
            zone_name TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            prefix TEXT NOT NULL,
            total_slots INTEGER NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS parking_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot_code TEXT UNIQUE NOT NULL,
            zone_key TEXT NOT NULL,
            zone_name TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'empty',
            plate TEXT DEFAULT '',
            student_code TEXT DEFAULT '',
            student_name TEXT DEFAULT '',
            note TEXT DEFAULT '',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS parking_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot_code TEXT,
            zone_name TEXT,
            plate TEXT,
            student_code TEXT,
            student_name TEXT,
            action TEXT NOT NULL,
            fee INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cur.execute("SELECT COUNT(*) AS total FROM users")
    if cur.fetchone()["total"] == 0:
        cur.executemany("""
            INSERT INTO users (username, password, full_name, role, student_code, balance)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            ("admin", "admin123", "Admin UTT", "admin", "", 0),
            ("75DCTT21001", "123456", "Nguyễn Văn An",
             "student", "75DCTT21001", 50000),
            ("75DCTT21002", "123456", "Trần Minh Anh",
             "student", "75DCTT21002", 50000)
        ])

    cur.execute("SELECT COUNT(*) AS total FROM parking_zones")
    if cur.fetchone()["total"] == 0:
        zones = [
            ("student1", "Khu gửi xe 1", "Xe máy", "SV1", 20),
            ("bike2", "Khu gửi xe 2", "Xe máy", "SV2", 20),
            ("bike3", "Khu gửi xe 3", "Xe máy", "SV3", 20),
            ("teacher", "Khu giáo viên", "Xe máy", "GV", 20),
            ("car", "Khu ô tô", "Ô tô", "OTO", 20)
        ]

        cur.executemany("""
            INSERT INTO parking_zones (zone_key, zone_name, vehicle_type, prefix, total_slots)
            VALUES (?, ?, ?, ?, ?)
        """, zones)

        for zone_key, zone_name, vehicle_type, prefix, total_slots in zones:
            for i in range(1, total_slots + 1):
                slot_code = f"{prefix}{str(i).zfill(3)}"
                status = "empty"
                plate = ""
                student_code = ""
                student_name = ""
                note = ""

                if zone_key == "car" and i <= 6:
                    status = "car"
                    plate = f"30A-{12000 + i}"
                    note = "Xe đang gửi trong bãi"

                if zone_key != "car" and i in [1, 4, 10]:
                    status = "used"
                    plate = f"29X1-{10000 + i}"
                    student_code = f"75DCTT21{300 + i}"
                    student_name = f"Sinh viên {i}"
                    note = "Xe đang gửi trong bãi"

                if zone_key != "car" and i == 15:
                    status = "warning"
                    plate = "29X9-88888"
                    note = "Xe cần kiểm tra"

                cur.execute("""
                    INSERT INTO parking_slots
                    (slot_code, zone_key, zone_name, vehicle_type, status, plate, student_code, student_name, note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    slot_code,
                    zone_key,
                    zone_name,
                    vehicle_type,
                    status,
                    plate,
                    student_code,
                    student_name,
                    note
                ))

    conn.commit()
    conn.close()


def send_frontend_file(filename):
    file_path = os.path.join(FRONTEND_DIR, filename)

    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIR, filename)

    return jsonify({
        "success": False,
        "message": f"Không tìm thấy file frontend: {filename}"
    }), 404


@app.route("/")
def index_page():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    login_path = os.path.join(FRONTEND_DIR, "login_new.html")

    if os.path.isfile(index_path):
        return send_from_directory(FRONTEND_DIR, "index.html")

    if os.path.isfile(login_path):
        return send_from_directory(FRONTEND_DIR, "login_new.html")

    return jsonify({
        "success": True,
        "message": "Backend Smart UTT Parking đang hoạt động"
    })


@app.route("/index.html")
def index_html_page():
    return send_frontend_file("index.html")


@app.route("/login_new.html")
def login_new_page():
    return send_frontend_file("login_new.html")


@app.route("/admin-dashboard.html")
def admin_dashboard_html_page():
    return send_frontend_file("admin-dashboard.html")


@app.route("/parking.html")
def parking_html_page():
    return send_frontend_file("parking.html")


@app.route("/parking_layout.html")
def parking_layout_html_page():
    return send_frontend_file("parking_layout.html")


@app.route("/parking-layout.html")
def parking_layout_dash_html_page():
    return send_frontend_file("parking-layout.html")


@app.route("/student/<path:filename>")
def student_frontend_page(filename):
    return send_frontend_file(os.path.join("student", filename))


@app.route("/assets/<path:filename>")
def assets_file(filename):
    root_asset_path = os.path.join(ROOT_ASSETS_DIR, filename)
    frontend_asset_path = os.path.join(FRONTEND_ASSETS_DIR, filename)

    if os.path.isfile(root_asset_path):
        return send_from_directory(ROOT_ASSETS_DIR, filename)

    if os.path.isfile(frontend_asset_path):
        return send_from_directory(FRONTEND_ASSETS_DIR, filename)

    return jsonify({
        "success": False,
        "message": f"Không tìm thấy file assets: {filename}"
    }), 404


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "success": True,
        "message": "Backend Smart UTT Parking đang hoạt động",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}

    username = (
        data.get("username")
        or data.get("email")
        or data.get("studentCode")
        or data.get("student_code")
        or ""
    ).strip()

    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({
            "success": False,
            "message": "Vui lòng nhập tài khoản và mật khẩu"
        }), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, username, full_name, role, student_code, balance
        FROM users
        WHERE username = ? AND password = ?
    """, (username, password))

    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({
            "success": False,
            "message": "Sai tài khoản hoặc mật khẩu"
        }), 401

    user_data = dict(user)

    return jsonify({
        "success": True,
        "message": "Đăng nhập thành công",
        "user": user_data
    })


@app.route("/api/stats", methods=["GET"])
def api_stats():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            COUNT(*) AS total_slots,
            SUM(CASE WHEN status = 'empty' THEN 1 ELSE 0 END) AS empty_slots,
            SUM(CASE WHEN status IN ('used', 'car') THEN 1 ELSE 0 END) AS used_slots,
            SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_slots
        FROM parking_slots
    """)
    stats = dict(cur.fetchone())

    cur.execute("""
        SELECT COUNT(DISTINCT student_code) AS total_students
        FROM parking_slots
        WHERE student_code IS NOT NULL AND student_code != ''
    """)
    total_students = cur.fetchone()["total_students"]

    cur.execute("""
        SELECT COALESCE(SUM(fee), 0) AS today_revenue
        FROM parking_transactions
        WHERE DATE(created_at) = DATE('now')
    """)
    today_revenue = cur.fetchone()["today_revenue"]

    conn.close()

    total_slots = stats["total_slots"] or 0
    empty_slots = stats["empty_slots"] or 0
    used_slots = stats["used_slots"] or 0
    warning_slots = stats["warning_slots"] or 0

    return jsonify({
        "success": True,
        "totalSlots": total_slots,
        "availableSlots": empty_slots,
        "emptySlots": empty_slots,
        "occupiedSlots": used_slots,
        "usedSlots": used_slots,
        "warningSlots": warning_slots,
        "totalStudents": total_students or 0,
        "todayRevenue": today_revenue or 0
    })


@app.route("/api/parking-lots", methods=["GET"])
def api_parking_lots():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            z.zone_key,
            z.zone_name,
            z.vehicle_type,
            z.prefix,
            COUNT(s.id) AS total_slots,
            SUM(CASE WHEN s.status = 'empty' THEN 1 ELSE 0 END) AS empty_slots,
            SUM(CASE WHEN s.status IN ('used', 'car') THEN 1 ELSE 0 END) AS used_slots,
            SUM(CASE WHEN s.status = 'warning' THEN 1 ELSE 0 END) AS warning_slots
        FROM parking_zones z
        LEFT JOIN parking_slots s ON s.zone_key = z.zone_key
        GROUP BY z.zone_key, z.zone_name, z.vehicle_type, z.prefix
        ORDER BY z.id
    """)

    rows = cur.fetchall()
    conn.close()

    lots = []

    for row in rows:
        item = dict(row)
        total = item["total_slots"] or 0
        used = item["used_slots"] or 0
        empty = item["empty_slots"] or 0
        warning = item["warning_slots"] or 0

        lots.append({
            "zoneKey": item["zone_key"],
            "id": item["zone_key"],
            "name": item["zone_name"],
            "zoneName": item["zone_name"],
            "vehicleType": item["vehicle_type"],
            "prefix": item["prefix"],
            "totalSlots": total,
            "availableSlots": empty,
            "emptySlots": empty,
            "occupiedSlots": used,
            "usedSlots": used,
            "warningSlots": warning,
            "density": 0 if total == 0 else round((used / total) * 100)
        })

    return jsonify(lots)


@app.route("/api/slots", methods=["GET"])
def api_slots():
    zone_key = request.args.get("zoneKey") or request.args.get("zone_key")

    conn = get_db()
    cur = conn.cursor()

    if zone_key:
        cur.execute("""
            SELECT *
            FROM parking_slots
            WHERE zone_key = ?
            ORDER BY id
        """, (zone_key,))
    else:
        cur.execute("""
            SELECT *
            FROM parking_slots
            ORDER BY id
        """)

    rows = cur.fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "slots": rows_to_dicts(rows)
    })


@app.route("/api/admin/dashboard", methods=["GET"])
def api_admin_dashboard():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            COUNT(*) AS total_slots,
            SUM(CASE WHEN status = 'empty' THEN 1 ELSE 0 END) AS empty_slots,
            SUM(CASE WHEN status IN ('used', 'car') THEN 1 ELSE 0 END) AS used_slots,
            SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) AS warning_slots
        FROM parking_slots
    """)
    stats = dict(cur.fetchone())

    cur.execute("""
        SELECT
            z.zone_key,
            z.zone_name,
            z.vehicle_type,
            COUNT(s.id) AS total_slots,
            SUM(CASE WHEN s.status = 'empty' THEN 1 ELSE 0 END) AS empty_slots,
            SUM(CASE WHEN s.status IN ('used', 'car') THEN 1 ELSE 0 END) AS used_slots,
            SUM(CASE WHEN s.status = 'warning' THEN 1 ELSE 0 END) AS warning_slots
        FROM parking_zones z
        LEFT JOIN parking_slots s ON s.zone_key = z.zone_key
        GROUP BY z.zone_key, z.zone_name, z.vehicle_type
        ORDER BY z.id
    """)
    zones = rows_to_dicts(cur.fetchall())

    cur.execute("""
        SELECT slot_code, zone_name, vehicle_type, status, plate, student_code, student_name, note, updated_at
        FROM parking_slots
        WHERE status IN ('used', 'car', 'warning')
        ORDER BY updated_at DESC
        LIMIT 10
    """)
    recent = rows_to_dicts(cur.fetchall())

    cur.execute("""
        SELECT slot_code, zone_name, vehicle_type, status, plate, student_code, student_name, note, updated_at
        FROM parking_slots
        WHERE status = 'warning'
        ORDER BY updated_at DESC
    """)
    alerts = rows_to_dicts(cur.fetchall())

    conn.close()

    return jsonify({
        "success": True,
        "stats": stats,
        "zones": zones,
        "recent": recent,
        "alerts": alerts
    })


@app.route("/api/vehicle/in", methods=["POST"])
def api_vehicle_in():
    data = request.get_json(silent=True) or {}

    zone_key = (data.get("zoneKey") or data.get("zone_key") or "").strip()
    plate = (data.get("plate") or "").strip().upper()
    student_code = (data.get("studentCode") or data.get(
        "student_code") or "").strip().upper()
    student_name = (data.get("studentName") or data.get(
        "student_name") or "").strip()

    if not zone_key:
        return jsonify({
            "success": False,
            "message": "Thiếu khu gửi xe"
        }), 400

    if not plate:
        return jsonify({
            "success": False,
            "message": "Vui lòng nhập biển số xe"
        }), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE plate = ? AND status IN ('used', 'car', 'warning')
    """, (plate,))
    existing = cur.fetchone()

    if existing:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Biển số này đang tồn tại trong bãi"
        }), 409

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE zone_key = ? AND status = 'empty'
        ORDER BY id
        LIMIT 1
    """, (zone_key,))
    slot = cur.fetchone()

    if not slot:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Khu này hiện không còn ô trống"
        }), 409

    slot = dict(slot)
    new_status = "car" if zone_key == "car" else "used"

    cur.execute("""
        UPDATE parking_slots
        SET status = ?,
            plate = ?,
            student_code = ?,
            student_name = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE slot_code = ?
    """, (
        new_status,
        plate,
        student_code,
        student_name,
        "Ghi nhận xe vào bãi",
        slot["slot_code"]
    ))

    cur.execute("""
        INSERT INTO parking_transactions
        (slot_code, zone_name, plate, student_code, student_name, action, fee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        slot["slot_code"],
        slot["zone_name"],
        plate,
        student_code,
        student_name,
        "IN",
        0
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã ghi nhận xe vào bãi",
        "slotCode": slot["slot_code"]
    })


@app.route("/api/vehicle/out", methods=["POST"])
def api_vehicle_out():
    data = request.get_json(silent=True) or {}

    plate = (data.get("plate") or "").strip().upper()
    slot_code = (data.get("slotCode") or data.get(
        "slot_code") or "").strip().upper()

    if not plate and not slot_code:
        return jsonify({
            "success": False,
            "message": "Vui lòng nhập biển số hoặc mã ô"
        }), 400

    conn = get_db()
    cur = conn.cursor()

    if plate:
        cur.execute("""
            SELECT *
            FROM parking_slots
            WHERE plate = ? AND status IN ('used', 'car', 'warning')
        """, (plate,))
    else:
        cur.execute("""
            SELECT *
            FROM parking_slots
            WHERE slot_code = ? AND status IN ('used', 'car', 'warning')
        """, (slot_code,))

    slot = cur.fetchone()

    if not slot:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy xe trong bãi"
        }), 404

    slot = dict(slot)
    fee = 5000 if slot["vehicle_type"] == "Ô tô" else 3000

    cur.execute("""
        UPDATE parking_slots
        SET status = 'empty',
            plate = '',
            student_code = '',
            student_name = '',
            note = 'Xe đã ra khỏi bãi',
            updated_at = CURRENT_TIMESTAMP
        WHERE slot_code = ?
    """, (slot["slot_code"],))

    cur.execute("""
        INSERT INTO parking_transactions
        (slot_code, zone_name, plate, student_code, student_name, action, fee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        slot["slot_code"],
        slot["zone_name"],
        slot["plate"],
        slot["student_code"],
        slot["student_name"],
        "OUT",
        fee
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã ghi nhận xe ra khỏi bãi",
        "slotCode": slot["slot_code"],
        "fee": fee
    })


@app.route("/api/alerts/<slot_code>/resolve", methods=["POST"])
def api_resolve_alert(slot_code):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE slot_code = ?
    """, (slot_code,))
    slot = cur.fetchone()

    if not slot:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy ô cảnh báo"
        }), 404

    slot = dict(slot)

    if slot["plate"]:
        new_status = "car" if slot["zone_key"] == "car" else "used"
        note = "Cảnh báo đã được xử lý"
    else:
        new_status = "empty"
        note = ""

    cur.execute("""
        UPDATE parking_slots
        SET status = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE slot_code = ?
    """, (new_status, note, slot_code))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã xử lý cảnh báo"
    })


@app.route("/api/transactions", methods=["GET"])
def api_transactions():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_transactions
        ORDER BY created_at DESC
        LIMIT 100
    """)

    rows = cur.fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "transactions": rows_to_dicts(rows)
    })


@app.route("/<path:filename>")
def frontend_fallback(filename):
    if filename.startswith("api/"):
        return jsonify({
            "success": False,
            "message": "API không tồn tại"
        }), 404

    file_path = os.path.join(FRONTEND_DIR, filename)

    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIR, filename)

    return jsonify({
        "success": False,
        "message": f"Không tìm thấy đường dẫn: {filename}"
    }), 404


init_database()

if __name__ == "__main__":
    app.run(debug=True)

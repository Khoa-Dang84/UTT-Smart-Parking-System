import os
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory

try:
    from flask_cors import CORS
except ImportError:
    CORS = None


APP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(APP_DIR)
FRONTEND_DIR = os.path.join(PROJECT_DIR, "frontend")
ASSETS_DIR = os.path.join(PROJECT_DIR, "assets")
DB_PATH = os.path.join(APP_DIR, "parking.db")

BIKE_FEE = 3000
CAR_FEE = 5000

app = Flask(__name__, static_folder=None)

if CORS:
    CORS(app)


# =========================
# DATABASE HELPERS
# =========================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def add_column_if_missing(cur, table_name, column_name, definition):
    cur.execute(f"PRAGMA table_info({table_name})")
    columns = [row["name"] for row in cur.fetchall()]

    if column_name not in columns:
        cur.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def send_frontend_file(filename):
    filename = filename.replace("\\", "/").lstrip("/")
    file_path = os.path.join(FRONTEND_DIR, filename)

    if os.path.isfile(file_path):
        return send_from_directory(os.path.dirname(file_path), os.path.basename(file_path))

    return jsonify({
        "success": False,
        "message": f"Không tìm thấy file frontend: {filename}",
        "frontend_dir": FRONTEND_DIR
    }), 404


# =========================
# PAGE ROUTES
# =========================

@app.route("/")
@app.route("/index.html")
def index_page():
    index_path = os.path.join(FRONTEND_DIR, "index.html")

    if os.path.isfile(index_path):
        return send_frontend_file("index.html")

    return send_frontend_file("login_new.html")


@app.route("/login.html")
@app.route("/login_new.html")
def login_page():
    return send_frontend_file("login_new.html")


@app.route("/admin-dashboard.html")
def admin_dashboard_page():
    return send_frontend_file("admin-dashboard.html")


@app.route("/parking.html")
def parking_page():
    return send_frontend_file("parking.html")


@app.route("/parking_layout.html")
@app.route("/parking-layout.html")
def parking_layout_page():
    return send_frontend_file("parking_layout.html")


@app.route("/student/<path:filename>")
def student_page(filename):
    return send_frontend_file(os.path.join("student", filename))


@app.route("/assets/<path:filename>")
def assets_file(filename):
    asset_path = os.path.join(ASSETS_DIR, filename)

    if os.path.isfile(asset_path):
        return send_from_directory(ASSETS_DIR, filename)

    frontend_asset_path = os.path.join(FRONTEND_DIR, "assets", filename)

    if os.path.isfile(frontend_asset_path):
        return send_from_directory(os.path.join(FRONTEND_DIR, "assets"), filename)

    return jsonify({
        "success": False,
        "message": f"Không tìm thấy assets: {filename}"
    }), 404


@app.route("/api.js")
@app.route("/assets/js/api.js")
def api_js_file():
    return send_frontend_file("api.js")


# =========================
# INIT DATABASE
# =========================

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
            slot_code TEXT DEFAULT '',
            zone_name TEXT DEFAULT '',
            plate TEXT DEFAULT '',
            student_code TEXT DEFAULT '',
            student_name TEXT DEFAULT '',
            action TEXT NOT NULL,
            fee INTEGER DEFAULT 0,
            amount INTEGER DEFAULT 0,
            balance_before INTEGER DEFAULT 0,
            balance_after INTEGER DEFAULT 0,
            description TEXT DEFAULT '',
            payment_method TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    add_column_if_missing(cur, "parking_transactions",
                          "amount", "INTEGER DEFAULT 0")
    add_column_if_missing(cur, "parking_transactions",
                          "balance_before", "INTEGER DEFAULT 0")
    add_column_if_missing(cur, "parking_transactions",
                          "balance_after", "INTEGER DEFAULT 0")
    add_column_if_missing(cur, "parking_transactions",
                          "description", "TEXT DEFAULT ''")
    add_column_if_missing(cur, "parking_transactions",
                          "payment_method", "TEXT DEFAULT ''")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS student_vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_code TEXT NOT NULL,
            owner_name TEXT DEFAULT '',
            plate TEXT NOT NULL,
            vehicle_type TEXT NOT NULL DEFAULT 'Xe máy',
            brand TEXT DEFAULT '',
            color TEXT DEFAULT '',
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_code, plate)
        )
    """)

    seed_users = [
        ("admin", "admin123", "Admin UTT", "admin", "", 0),
        ("75DCTT21001", "123456", "Nguyễn Văn An", "student", "75DCTT21001", 50000),
        ("75DCTT21002", "123456", "Trần Minh Anh", "student", "75DCTT21002", 50000),
        ("75DCTT21393", "123456", "Nguyễn Đăng Khoa", "student", "75DCTT21393", 50000)
    ]

    cur.executemany("""
        INSERT OR IGNORE INTO users
        (username, password, full_name, role, student_code, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    """, seed_users)

    zones = [
        ("student1", "Khu gửi xe 1", "Xe máy", "SV1", 20),
        ("bike2", "Khu gửi xe 2", "Xe máy", "SV2", 20),
        ("bike3", "Khu gửi xe 3", "Xe máy", "SV3", 20),
        ("teacher", "Khu giáo viên", "Xe máy", "GV", 20),
        ("car", "Khu ô tô", "Ô tô", "OTO", 20)
    ]

    cur.executemany("""
        INSERT OR IGNORE INTO parking_zones
        (zone_key, zone_name, vehicle_type, prefix, total_slots)
        VALUES (?, ?, ?, ?, ?)
    """, zones)

    cur.execute("SELECT COUNT(*) AS total FROM parking_slots")
    total_slots = cur.fetchone()["total"]

    if total_slots == 0:
        for zone_key, zone_name, vehicle_type, prefix, total in zones:
            for i in range(1, total + 1):
                cur.execute("""
                    INSERT INTO parking_slots
                    (slot_code, zone_key, zone_name, vehicle_type, status)
                    VALUES (?, ?, ?, ?, 'empty')
                """, (
                    f"{prefix}{str(i).zfill(3)}",
                    zone_key,
                    zone_name,
                    vehicle_type
                ))

    conn.commit()
    conn.close()

    seed_default_vehicles()


def make_default_vietnam_plate(student_code):
    seed = sum((i + 1) * ord(ch) for i, ch in enumerate(student_code))
    return "29X1-" + str(10000 + seed % 90000)


def seed_default_vehicles():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT username, full_name, student_code
        FROM users
        WHERE role = 'student'
    """)

    students = rows_to_dicts(cur.fetchall())
    conn.close()

    for student in students:
        code = student.get("student_code") or student.get("username")
        name = student.get("full_name") or ""
        ensure_default_vehicle_for_student(code, name)


# =========================
# COMMON HELPERS
# =========================

def get_student_code_from_request():
    data = request.get_json(silent=True) or {}

    return (
        request.args.get("student_code")
        or request.args.get("studentCode")
        or data.get("student_code")
        or data.get("studentCode")
        or ""
    ).strip().upper()


def get_student_user(student_code):
    if not student_code:
        return None

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, username, full_name, role, student_code, balance
        FROM users
        WHERE username = ? OR student_code = ?
        LIMIT 1
    """, (student_code, student_code))

    row = cur.fetchone()
    conn.close()

    return dict(row) if row else None


def get_or_create_student_user(student_code, full_name=None):
    user = get_student_user(student_code)

    if user:
        return user

    conn = get_db()
    cur = conn.cursor()

    name = full_name or f"Sinh viên {student_code}"

    cur.execute("""
        INSERT INTO users
        (username, password, full_name, role, student_code, balance)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (student_code, "123456", name, "student", student_code, 50000))

    conn.commit()
    conn.close()

    return get_student_user(student_code)


def ensure_default_vehicle_for_student(student_code, owner_name):
    if not student_code:
        return

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT COUNT(*) AS total
        FROM student_vehicles
        WHERE student_code = ?
    """, (student_code,))

    total = cur.fetchone()["total"]

    if total == 0:
        cur.execute("""
            INSERT OR IGNORE INTO student_vehicles
            (student_code, owner_name, plate, vehicle_type, brand, color, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            student_code,
            owner_name or "",
            make_default_vietnam_plate(student_code),
            "Xe máy",
            "Honda",
            "Đen",
            1
        ))

    conn.commit()
    conn.close()


def get_student_vehicle(student_code, plate):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM student_vehicles
        WHERE student_code = ? AND plate = ?
        LIMIT 1
    """, (student_code, plate))

    row = cur.fetchone()
    conn.close()

    return dict(row) if row else None


def ensure_vehicle_for_student(student_code, owner_name, plate, vehicle_type="Xe máy"):
    if not student_code or not plate:
        return

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT COUNT(*) AS total
        FROM student_vehicles
        WHERE student_code = ? AND plate = ?
    """, (student_code, plate))

    exists = cur.fetchone()["total"]

    if exists == 0:
        cur.execute("""
            SELECT COUNT(*) AS total
            FROM student_vehicles
            WHERE student_code = ?
        """, (student_code,))

        total = cur.fetchone()["total"]

        cur.execute("""
            INSERT OR IGNORE INTO student_vehicles
            (student_code, owner_name, plate, vehicle_type, brand, color, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            student_code,
            owner_name or "",
            plate,
            vehicle_type or "Xe máy",
            "",
            "",
            1 if total == 0 else 0
        ))

    conn.commit()
    conn.close()


def vehicle_fee(vehicle_type):
    return CAR_FEE if vehicle_type == "Ô tô" else BIKE_FEE


def action_text(action):
    return {
        "TOPUP": "Nạp tiền",
        "CHECKIN": "Gửi xe / Trừ phí",
        "CHECKOUT": "Lấy xe",
        "ADMIN_CHECKIN": "Admin ghi xe vào",
        "ADMIN_CHECKOUT": "Admin ghi xe ra"
    }.get(action, action)


def add_transaction(
    cur,
    *,
    slot_code="",
    zone_name="",
    plate="",
    student_code="",
    student_name="",
    action="",
    fee=0,
    amount=0,
    balance_before=0,
    balance_after=0,
    description="",
    payment_method=""
):
    cur.execute("""
        INSERT INTO parking_transactions
        (
            slot_code,
            zone_name,
            plate,
            student_code,
            student_name,
            action,
            fee,
            amount,
            balance_before,
            balance_after,
            description,
            payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        slot_code,
        zone_name,
        plate,
        student_code,
        student_name,
        action,
        fee,
        amount,
        balance_before,
        balance_after,
        description,
        payment_method
    ))


def normalize_slot(row):
    item = dict(row)

    return {
        "id": item.get("id"),
        "slotCode": item.get("slot_code"),
        "slot_code": item.get("slot_code"),
        "zoneKey": item.get("zone_key"),
        "zone_key": item.get("zone_key"),
        "zoneName": item.get("zone_name"),
        "zone_name": item.get("zone_name"),
        "vehicleType": item.get("vehicle_type"),
        "vehicle_type": item.get("vehicle_type"),
        "status": item.get("status"),
        "plate": item.get("plate") or "",
        "studentCode": item.get("student_code") or "",
        "student_code": item.get("student_code") or "",
        "studentName": item.get("student_name") or "",
        "student_name": item.get("student_name") or "",
        "note": item.get("note") or "",
        "updatedAt": item.get("updated_at"),
        "updated_at": item.get("updated_at")
    }


# =========================
# AUTH API
# =========================

@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "success": True,
        "message": "Backend UTT Smart Parking System đang hoạt động",
        "time": now_text()
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}

    username = (
        data.get("username")
        or data.get("studentCode")
        or data.get("student_code")
        or ""
    ).strip()

    password = (data.get("password") or "").strip()
    requested_role = (data.get("role") or "").strip()

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
        LIMIT 1
    """, (username, password))

    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({
            "success": False,
            "message": "Sai tài khoản hoặc mật khẩu"
        }), 401

    user = dict(row)

    if requested_role and user["role"] != requested_role:
        return jsonify({
            "success": False,
            "message": "Vai trò đăng nhập không khớp với tài khoản"
        }), 403

    if user["role"] == "student":
        student_code = user.get("student_code") or user.get("username")
        ensure_default_vehicle_for_student(student_code, user.get("full_name"))

    return jsonify({
        "success": True,
        "message": "Đăng nhập thành công",
        "user": user
    })


# =========================
# PARKING API
# =========================

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
        SELECT COALESCE(SUM(fee), 0) AS revenue
        FROM parking_transactions
        WHERE DATE(created_at) = DATE('now')
          AND action IN ('CHECKIN', 'ADMIN_CHECKIN')
    """)

    revenue = cur.fetchone()["revenue"]

    conn.close()

    return jsonify({
        "success": True,
        "totalSlots": stats["total_slots"] or 0,
        "emptySlots": stats["empty_slots"] or 0,
        "availableSlots": stats["empty_slots"] or 0,
        "usedSlots": stats["used_slots"] or 0,
        "occupiedSlots": stats["used_slots"] or 0,
        "warningSlots": stats["warning_slots"] or 0,
        "todayRevenue": revenue or 0
    })


@app.route("/api/parking-lots", methods=["GET"])
@app.route("/api/student/parking/zones", methods=["GET"])
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

    rows = rows_to_dicts(cur.fetchall())
    conn.close()

    zones = []

    for row in rows:
        total = row["total_slots"] or 0
        empty = row["empty_slots"] or 0
        used = row["used_slots"] or 0
        warning = row["warning_slots"] or 0

        zones.append({
            "id": row["zone_key"],
            "zoneKey": row["zone_key"],
            "zone_key": row["zone_key"],
            "name": row["zone_name"],
            "zoneName": row["zone_name"],
            "zone_name": row["zone_name"],
            "vehicleType": row["vehicle_type"],
            "vehicle_type": row["vehicle_type"],
            "prefix": row["prefix"],
            "totalSlots": total,
            "total_slots": total,
            "emptySlots": empty,
            "empty_slots": empty,
            "availableSlots": empty,
            "usedSlots": used,
            "used_slots": used,
            "occupiedSlots": used,
            "warningSlots": warning,
            "warning_slots": warning,
            "density": 0 if total == 0 else round((used / total) * 100)
        })

    if request.path.startswith("/api/student"):
        return jsonify({
            "success": True,
            "zones": zones
        })

    return jsonify(zones)


@app.route("/api/slots", methods=["GET"])
def api_slots():
    zone_key = request.args.get(
        "zoneKey") or request.args.get("zone_key") or ""

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
        "slots": [normalize_slot(row) for row in rows]
    })


@app.route("/api/slots/<slot_code>", methods=["GET"])
def api_slot_detail(slot_code):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE slot_code = ?
        LIMIT 1
    """, (slot_code.upper(),))

    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy ô gửi xe"
        }), 404

    return jsonify({
        "success": True,
        "slot": normalize_slot(row)
    })


@app.route("/api/admin/dashboard", methods=["GET"])
def api_admin_dashboard():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE status IN ('used', 'car', 'warning')
        ORDER BY updated_at DESC
        LIMIT 20
    """)

    recent = rows_to_dicts(cur.fetchall())

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE status = 'warning'
        ORDER BY updated_at DESC
    """)

    alerts = rows_to_dicts(cur.fetchall())
    conn.close()

    return jsonify({
        "success": True,
        "stats": api_stats().get_json(),
        "zones": api_parking_lots().get_json(),
        "recent": recent,
        "alerts": alerts
    })


# =========================
# VEHICLE IN / OUT
# =========================

@app.route("/api/vehicle/in", methods=["POST"])
@app.route("/api/student/parking/checkin", methods=["POST"])
def api_vehicle_in():
    data = request.get_json(silent=True) or {}
    is_student_request = request.path.startswith("/api/student")

    zone_key = (data.get("zoneKey") or data.get("zone_key") or "").strip()
    plate = (data.get("plate") or "").strip().upper()
    student_code = (
        data.get("studentCode")
        or data.get("student_code")
        or ""
    ).strip().upper()

    student_name = (data.get("studentName") or data.get(
        "student_name") or "").strip()

    if not zone_key:
        return jsonify({
            "success": False,
            "message": "Vui lòng chọn khu gửi xe"
        }), 400

    if not plate:
        return jsonify({
            "success": False,
            "message": "Vui lòng chọn hoặc nhập biển số xe"
        }), 400

    user = None
    student_vehicle = None

    if student_code:
        user = get_or_create_student_user(student_code, student_name)
        student_name = user.get("full_name") if user else student_name
        ensure_default_vehicle_for_student(student_code, student_name)

        student_vehicle = get_student_vehicle(student_code, plate)

        if is_student_request and not student_vehicle:
            return jsonify({
                "success": False,
                "message": "Xe này chưa được khai báo trong mục Xe của tôi"
            }), 400

        if not student_vehicle:
            ensure_vehicle_for_student(
                student_code, student_name, plate, "Xe máy")
            student_vehicle = get_student_vehicle(student_code, plate)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_zones
        WHERE zone_key = ?
        LIMIT 1
    """, (zone_key,))

    zone = cur.fetchone()

    if not zone:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy khu gửi xe"
        }), 404

    zone = dict(zone)

    vehicle_type = student_vehicle.get(
        "vehicle_type") if student_vehicle else zone["vehicle_type"]

    if vehicle_type == "Ô tô" and zone_key != "car":
        conn.close()
        return jsonify({
            "success": False,
            "message": "Ô tô chỉ được gửi ở Khu ô tô"
        }), 400

    if vehicle_type != "Ô tô" and zone_key == "car":
        conn.close()
        return jsonify({
            "success": False,
            "message": "Xe máy/xe điện không gửi ở Khu ô tô"
        }), 400

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE plate = ? AND status IN ('used', 'car', 'warning')
        LIMIT 1
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
            "message": "Khu này hiện không còn chỗ trống"
        }), 409

    slot = dict(slot)
    fee = vehicle_fee(vehicle_type)

    balance_before = 0
    balance_after = 0
    amount = 0

    if student_code:
        cur.execute("""
            SELECT balance
            FROM users
            WHERE student_code = ? OR username = ?
            LIMIT 1
        """, (student_code, student_code))

        balance_row = cur.fetchone()
        balance_before = safe_int(balance_row["balance"]) if balance_row else 0

        if balance_before < fee:
            conn.close()
            return jsonify({
                "success": False,
                "message": f"Số dư không đủ. Cần {fee:,}đ để gửi xe.".replace(",", ".")
            }), 400

        balance_after = balance_before - fee
        amount = -fee

        cur.execute("""
            UPDATE users
            SET balance = ?
            WHERE student_code = ? OR username = ?
        """, (balance_after, student_code, student_code))

    new_status = "car" if slot["vehicle_type"] == "Ô tô" else "used"

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
        "Đã trừ phí gửi xe từ ví sinh viên" if student_code else "Admin ghi nhận xe vào",
        slot["slot_code"]
    ))

    add_transaction(
        cur,
        slot_code=slot["slot_code"],
        zone_name=slot["zone_name"],
        plate=plate,
        student_code=student_code,
        student_name=student_name,
        action="CHECKIN" if student_code else "ADMIN_CHECKIN",
        fee=fee,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        description="Gửi xe và trừ phí từ ví" if student_code else "Admin ghi nhận xe vào",
        payment_method="Ví sinh viên" if student_code else "Ghi nhận tại bãi"
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã ghi nhận xe vào bãi và trừ phí từ ví" if student_code else "Đã ghi nhận xe vào bãi",
        "slotCode": slot["slot_code"],
        "zoneName": slot["zone_name"],
        "fee": fee,
        "balanceBefore": balance_before,
        "balanceAfter": balance_after
    })


@app.route("/api/vehicle/out", methods=["POST"])
@app.route("/api/student/parking/checkout", methods=["POST"])
def api_vehicle_out():
    data = request.get_json(silent=True) or {}

    plate = (data.get("plate") or "").strip().upper()
    slot_code = (data.get("slotCode") or data.get(
        "slot_code") or "").strip().upper()
    student_code = (
        data.get("studentCode")
        or data.get("student_code")
        or ""
    ).strip().upper()

    if not plate and not slot_code:
        return jsonify({
            "success": False,
            "message": "Vui lòng nhập biển số hoặc mã ô"
        }), 400

    conn = get_db()
    cur = conn.cursor()

    query = """
        SELECT *
        FROM parking_slots
        WHERE status IN ('used', 'car', 'warning')
    """

    params = []

    if plate:
        query += " AND plate = ?"
        params.append(plate)

    if slot_code:
        query += " AND slot_code = ?"
        params.append(slot_code)

    if request.path.startswith("/api/student") and student_code:
        query += " AND student_code = ?"
        params.append(student_code)

    query += " LIMIT 1"

    cur.execute(query, params)
    slot = cur.fetchone()

    if not slot:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy xe trong bãi"
        }), 404

    slot = dict(slot)

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

    add_transaction(
        cur,
        slot_code=slot["slot_code"],
        zone_name=slot["zone_name"],
        plate=slot["plate"],
        student_code=slot["student_code"],
        student_name=slot["student_name"],
        action="CHECKOUT",
        fee=0,
        amount=0,
        balance_before=0,
        balance_after=0,
        description="Lấy xe khỏi bãi",
        payment_method=""
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã ghi nhận xe ra khỏi bãi",
        "slotCode": slot["slot_code"],
        "fee": 0
    })


# =========================
# STUDENT VEHICLES
# =========================

@app.route("/api/student/vehicles", methods=["GET"])
def api_student_vehicles():
    student_code = get_student_code_from_request()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")
    owner_name = user.get("full_name") or ""

    ensure_default_vehicle_for_student(real_code, owner_name)

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM student_vehicles
        WHERE student_code = ?
        ORDER BY is_default DESC, created_at DESC
    """, (real_code,))

    vehicles = rows_to_dicts(cur.fetchall())

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE student_code = ?
          AND status IN ('used', 'car', 'warning')
        ORDER BY updated_at DESC
    """, (real_code,))

    active_parking = rows_to_dicts(cur.fetchall())

    conn.close()

    active_by_plate = {
        item["plate"]: item for item in active_parking if item.get("plate")
    }

    for vehicle in vehicles:
        vehicle["isParking"] = vehicle.get("plate") in active_by_plate
        vehicle["parkingInfo"] = active_by_plate.get(vehicle.get("plate"))

    return jsonify({
        "success": True,
        "student": {
            "studentCode": real_code,
            "fullName": owner_name
        },
        "vehicles": vehicles,
        "activeParking": active_parking
    })


@app.route("/api/student/vehicles", methods=["POST"])
def api_student_vehicle_add():
    data = request.get_json(silent=True) or {}

    student_code = get_student_code_from_request()
    plate = (data.get("plate") or "").strip().upper()
    vehicle_type = (data.get("vehicleType") or data.get(
        "vehicle_type") or "Xe máy").strip()
    brand = (data.get("brand") or "").strip()
    color = (data.get("color") or "").strip()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    if not plate:
        return jsonify({
            "success": False,
            "message": "Vui lòng nhập biển số xe"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")
    owner_name = user.get("full_name") or ""

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT COUNT(*) AS total
        FROM student_vehicles
        WHERE student_code = ?
    """, (real_code,))

    total = cur.fetchone()["total"]

    try:
        cur.execute("""
            INSERT INTO student_vehicles
            (student_code, owner_name, plate, vehicle_type, brand, color, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            real_code,
            owner_name,
            plate,
            vehicle_type,
            brand,
            color,
            1 if total == 0 else 0
        ))

        conn.commit()

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Biển số này đã tồn tại trong danh sách xe của bạn"
        }), 409

    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã khai báo xe thành công"
    })


@app.route("/api/student/vehicles/<int:vehicle_id>", methods=["DELETE"])
def api_student_vehicle_delete(vehicle_id):
    student_code = get_student_code_from_request()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM student_vehicles
        WHERE id = ? AND student_code = ?
        LIMIT 1
    """, (vehicle_id, real_code))

    vehicle = cur.fetchone()

    if not vehicle:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy xe cần xóa"
        }), 404

    vehicle = dict(vehicle)

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE plate = ?
          AND student_code = ?
          AND status IN ('used', 'car', 'warning')
        LIMIT 1
    """, (vehicle["plate"], real_code))

    active = cur.fetchone()

    if active:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Xe đang gửi trong bãi, không thể xóa"
        }), 400

    cur.execute("""
        DELETE FROM student_vehicles
        WHERE id = ? AND student_code = ?
    """, (vehicle_id, real_code))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã xóa xe khỏi danh sách"
    })


@app.route("/api/student/vehicles/<int:vehicle_id>/default", methods=["POST"])
def api_student_vehicle_default(vehicle_id):
    student_code = get_student_code_from_request()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM student_vehicles
        WHERE id = ? AND student_code = ?
        LIMIT 1
    """, (vehicle_id, real_code))

    vehicle = cur.fetchone()

    if not vehicle:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy xe"
        }), 404

    cur.execute("""
        UPDATE student_vehicles
        SET is_default = 0
        WHERE student_code = ?
    """, (real_code,))

    cur.execute("""
        UPDATE student_vehicles
        SET is_default = 1
        WHERE id = ? AND student_code = ?
    """, (vehicle_id, real_code))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã đặt làm xe mặc định"
    })


# =========================
# WALLET + HISTORY
# =========================

@app.route("/api/student/wallet", methods=["GET"])
def api_student_wallet():
    student_code = get_student_code_from_request()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_transactions
        WHERE student_code = ?
          AND action IN ('TOPUP', 'CHECKIN')
        ORDER BY created_at DESC
        LIMIT 50
    """, (real_code,))

    history = rows_to_dicts(cur.fetchall())
    conn.close()

    for row in history:
        row["actionText"] = action_text(row.get("action"))
        row["balanceChange"] = row.get("amount") or 0
        row["isMoneyAction"] = True

    return jsonify({
        "success": True,
        "wallet": {
            "studentCode": real_code,
            "fullName": user.get("full_name"),
            "balance": user.get("balance") or 0,
            "history": history,
            "topups": [row for row in history if row.get("action") == "TOPUP"]
        }
    })


@app.route("/api/student/wallet/topup", methods=["POST"])
def api_student_wallet_topup():
    data = request.get_json(silent=True) or {}

    student_code = get_student_code_from_request()
    amount = safe_int(data.get("amount"))
    method = (data.get("method") or "Nạp tiền tại quầy").strip()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    if amount < 10000:
        return jsonify({
            "success": False,
            "message": "Số tiền nạp tối thiểu là 10.000đ"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")

    conn = get_db()
    cur = conn.cursor()

    balance_before = safe_int(user.get("balance"))
    balance_after = balance_before + amount

    cur.execute("""
        UPDATE users
        SET balance = ?
        WHERE student_code = ? OR username = ?
    """, (balance_after, real_code, real_code))

    add_transaction(
        cur,
        zone_name="Ví sinh viên",
        student_code=real_code,
        student_name=user.get("full_name") or "",
        action="TOPUP",
        fee=0,
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        description="Nạp tiền vào ví",
        payment_method=method
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Nạp tiền thành công",
        "wallet": {
            "studentCode": real_code,
            "fullName": user.get("full_name"),
            "balance": balance_after
        }
    })


@app.route("/api/student/history", methods=["GET"])
def api_student_history():
    student_code = get_student_code_from_request()

    if not student_code:
        return jsonify({
            "success": False,
            "message": "Thiếu mã sinh viên"
        }), 400

    user = get_student_user(student_code)

    if not user:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy sinh viên"
        }), 404

    real_code = user.get("student_code") or user.get("username")

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_transactions
        WHERE student_code = ?
        ORDER BY created_at DESC
        LIMIT 100
    """, (real_code,))

    rows = rows_to_dicts(cur.fetchall())
    conn.close()

    for row in rows:
        row["actionText"] = action_text(row.get("action"))
        row["balanceChange"] = row.get("amount") or 0
        row["isMoneyAction"] = row.get("action") in ["TOPUP", "CHECKIN"]

    return jsonify({
        "success": True,
        "history": rows
    })


@app.route("/api/transactions", methods=["GET"])
def api_transactions():
    student_code = (
        request.args.get("student_code")
        or request.args.get("studentCode")
        or ""
    ).strip().upper()

    conn = get_db()
    cur = conn.cursor()

    if student_code:
        cur.execute("""
            SELECT *
            FROM parking_transactions
            WHERE student_code = ?
            ORDER BY created_at DESC
            LIMIT 100
        """, (student_code,))
    else:
        cur.execute("""
            SELECT *
            FROM parking_transactions
            ORDER BY created_at DESC
            LIMIT 150
        """)

    rows = rows_to_dicts(cur.fetchall())
    conn.close()

    for row in rows:
        row["actionText"] = action_text(row.get("action"))
        row["balanceChange"] = row.get("amount") or 0

    return jsonify({
        "success": True,
        "transactions": rows
    })


# =========================
# ALERTS
# =========================

@app.route("/api/alerts/<slot_code>/resolve", methods=["POST"])
def api_resolve_alert(slot_code):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT *
        FROM parking_slots
        WHERE slot_code = ?
        LIMIT 1
    """, (slot_code.upper(),))

    slot = cur.fetchone()

    if not slot:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Không tìm thấy ô cảnh báo"
        }), 404

    slot = dict(slot)

    if not slot.get("plate"):
        new_status = "empty"
    else:
        new_status = "car" if slot["vehicle_type"] == "Ô tô" else "used"

    cur.execute("""
        UPDATE parking_slots
        SET status = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE slot_code = ?
    """, (
        new_status,
        "Cảnh báo đã xử lý" if new_status != "empty" else "",
        slot_code.upper()
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã xử lý cảnh báo"
    })


# =========================
# FALLBACK
# =========================

@app.route("/<path:filename>")
def fallback_file(filename):
    if filename.startswith("api/"):
        return jsonify({
            "success": False,
            "message": "API không tồn tại"
        }), 404

    return send_frontend_file(filename)


init_database()


def ensure_user_contact_columns():
    conn = get_db()

    columns_raw = conn.execute("PRAGMA table_info(users)").fetchall()
    columns = []

    for row in columns_raw:
        try:
            columns.append(row["name"])
        except Exception:
            columns.append(row[1])

    if "phone" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''")

    if "email" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''")

    default_contacts = [
        ("75DCTT21001", "0901000001", "75DCTT21001@student.utt.edu.vn"),
        ("75DCTT21002", "0901000002", "75DCTT21002@student.utt.edu.vn"),
        ("75DCTT21393", "0901000393", "75DCTT21393@student.utt.edu.vn")
    ]

    for username, phone, email in default_contacts:
        conn.execute(
            """
            UPDATE users
            SET 
                phone = CASE 
                    WHEN phone IS NULL OR phone = '' THEN ? 
                    ELSE phone 
                END,
                email = CASE 
                    WHEN email IS NULL OR email = '' THEN ? 
                    ELSE email 
                END
            WHERE username = ? OR student_code = ?
            """,
            (phone, email, username, username)
        )

    conn.commit()
    conn.close()


@app.route("/api/admin/active-vehicles", methods=["GET"])
def api_admin_active_vehicles():
    ensure_user_contact_columns()

    conn = get_db()

    rows = conn.execute(
        """
        SELECT
            s.slot_code,
            s.zone_key,
            s.status,
            s.plate,
            s.student_code,
            s.student_name,
            s.updated_at,

            z.zone_name,
            z.vehicle_type AS zone_vehicle_type,

            u.full_name,
            u.phone,
            u.email,
            u.balance,

            sv.vehicle_type AS registered_vehicle_type,
            sv.brand,
            sv.color
        FROM parking_slots s
        LEFT JOIN parking_zones z 
            ON z.zone_key = s.zone_key
        LEFT JOIN users u 
            ON u.username = s.student_code 
            OR u.student_code = s.student_code
        LEFT JOIN student_vehicles sv
            ON sv.student_code = s.student_code
            AND sv.plate = s.plate
        WHERE s.status IN ('used', 'car', 'warning')
        ORDER BY s.updated_at DESC, s.slot_code ASC
        """
    ).fetchall()

    vehicles = []

    for row in rows:
        student_name = row["full_name"] or row["student_name"] or "Chưa có thông tin"
        phone = row["phone"] or "Chưa có số điện thoại"
        email = row["email"] or "Chưa có email"

        vehicles.append({
            "slotCode": row["slot_code"],
            "slot_code": row["slot_code"],

            "zoneKey": row["zone_key"],
            "zone_key": row["zone_key"],

            "zoneName": row["zone_name"],
            "zone_name": row["zone_name"],

            "status": row["status"],
            "plate": row["plate"],

            "studentCode": row["student_code"],
            "student_code": row["student_code"],

            "studentName": student_name,
            "student_name": student_name,

            "phone": phone,
            "email": email,

            "balance": row["balance"] or 0,

            "vehicleType": row["registered_vehicle_type"] or row["zone_vehicle_type"],
            "vehicle_type": row["registered_vehicle_type"] or row["zone_vehicle_type"],

            "brand": row["brand"] or "Chưa khai báo",
            "color": row["color"] or "Chưa khai báo",

            "updatedAt": row["updated_at"],
            "updated_at": row["updated_at"]
        })

    conn.close()

    return jsonify({
        "success": True,
        "vehicles": vehicles,
        "total": len(vehicles)
    })


@app.route("/api/admin/seed-active-vehicles", methods=["GET", "POST"])
def api_seed_active_vehicles():
    conn = get_db()

    # Bổ sung cột liên hệ nếu bảng users chưa có
    user_columns_raw = conn.execute("PRAGMA table_info(users)").fetchall()
    user_columns = [row["name"] for row in user_columns_raw]

    if "phone" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''")

    if "email" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''")

    conn.commit()

    # Đọc lại cột sau khi thêm
    user_columns_raw = conn.execute("PRAGMA table_info(users)").fetchall()
    user_columns = [row["name"] for row in user_columns_raw]

    vehicle_columns_raw = conn.execute(
        "PRAGMA table_info(student_vehicles)").fetchall()
    vehicle_columns = [row["name"] for row in vehicle_columns_raw]

    transaction_columns_raw = conn.execute(
        "PRAGMA table_info(parking_transactions)").fetchall()
    transaction_columns = [row["name"] for row in transaction_columns_raw]

    students = [
        {
            "student_code": "75DCTT21004",
            "full_name": "Nguyễn Minh Quân",
            "phone": "0904123001",
            "email": "75DCTT21004@student.utt.edu.vn",
            "plate": "29X1-21004",
            "vehicle_type": "Xe máy",
            "brand": "Honda Vision",
            "color": "Đen",
            "zone_key": "student1"
        },
        {
            "student_code": "75DCTT21005",
            "full_name": "Trần Thị Mai Anh",
            "phone": "0905123002",
            "email": "75DCTT21005@student.utt.edu.vn",
            "plate": "29X1-21005",
            "vehicle_type": "Xe máy",
            "brand": "Honda Lead",
            "color": "Trắng",
            "zone_key": "student1"
        },
        {
            "student_code": "75DCTT21006",
            "full_name": "Lê Đức Thành",
            "phone": "0906123003",
            "email": "75DCTT21006@student.utt.edu.vn",
            "plate": "29X2-21006",
            "vehicle_type": "Xe điện",
            "brand": "VinFast Feliz",
            "color": "Xanh",
            "zone_key": "bike2"
        },
        {
            "student_code": "75DCTT21007",
            "full_name": "Phạm Hải Nam",
            "phone": "0907123004",
            "email": "75DCTT21007@student.utt.edu.vn",
            "plate": "29X2-21007",
            "vehicle_type": "Xe máy",
            "brand": "Yamaha Sirius",
            "color": "Đỏ",
            "zone_key": "bike2"
        },
        {
            "student_code": "75DCTT21008",
            "full_name": "Đỗ Khánh Linh",
            "phone": "0908123005",
            "email": "75DCTT21008@student.utt.edu.vn",
            "plate": "29X3-21008",
            "vehicle_type": "Xe máy",
            "brand": "Honda Air Blade",
            "color": "Xám",
            "zone_key": "bike3"
        },
        {
            "student_code": "75DCTT21009",
            "full_name": "Vũ Hoàng Long",
            "phone": "0909123006",
            "email": "75DCTT21009@student.utt.edu.vn",
            "plate": "29X3-21009",
            "vehicle_type": "Xe điện",
            "brand": "VinFast Evo",
            "color": "Trắng",
            "zone_key": "bike3"
        },
        {
            "student_code": "75DCTT21010",
            "full_name": "Bùi Thanh Tùng",
            "phone": "0910123007",
            "email": "75DCTT21010@student.utt.edu.vn",
            "plate": "30A-21010",
            "vehicle_type": "Ô tô",
            "brand": "Toyota Vios",
            "color": "Bạc",
            "zone_key": "car"
        },
        {
            "student_code": "75DCTT21011",
            "full_name": "Hoàng Ngọc Hà",
            "phone": "0911123008",
            "email": "75DCTT21011@student.utt.edu.vn",
            "plate": "30A-21011",
            "vehicle_type": "Ô tô",
            "brand": "Hyundai Accent",
            "color": "Trắng",
            "zone_key": "car"
        }
    ]

    added = 0
    skipped = 0

    for student in students:
        student_code = student["student_code"]
        full_name = student["full_name"]
        phone = student["phone"]
        email = student["email"]
        plate = student["plate"]
        vehicle_type = student["vehicle_type"]
        brand = student["brand"]
        color = student["color"]
        zone_key = student["zone_key"]

        # Thêm hoặc cập nhật sinh viên
        existed_user = conn.execute(
            "SELECT id FROM users WHERE username = ? OR student_code = ?",
            (student_code, student_code)
        ).fetchone()

        if existed_user:
            conn.execute(
                """
                UPDATE users
                SET full_name = ?,
                    student_code = ?,
                    phone = ?,
                    email = ?,
                    balance = CASE
                        WHEN balance IS NULL OR balance < 50000 THEN 50000
                        ELSE balance
                    END
                WHERE username = ? OR student_code = ?
                """,
                (full_name, student_code, phone, email, student_code, student_code)
            )
        else:
            insert_data = {}

            if "username" in user_columns:
                insert_data["username"] = student_code

            if "password" in user_columns:
                insert_data["password"] = "123456"

            if "password_hash" in user_columns:
                try:
                    from werkzeug.security import generate_password_hash
                    insert_data["password_hash"] = generate_password_hash(
                        "123456")
                except Exception:
                    insert_data["password_hash"] = "123456"

            if "role" in user_columns:
                insert_data["role"] = "student"

            if "full_name" in user_columns:
                insert_data["full_name"] = full_name

            if "student_code" in user_columns:
                insert_data["student_code"] = student_code

            if "phone" in user_columns:
                insert_data["phone"] = phone

            if "email" in user_columns:
                insert_data["email"] = email

            if "balance" in user_columns:
                insert_data["balance"] = 50000

            columns_sql = ", ".join(insert_data.keys())
            marks_sql = ", ".join(["?"] * len(insert_data))
            values = list(insert_data.values())

            conn.execute(
                f"INSERT INTO users ({columns_sql}) VALUES ({marks_sql})",
                values
            )

        # Thêm xe cho sinh viên nếu chưa có
        existed_vehicle = conn.execute(
            """
            SELECT id 
            FROM student_vehicles 
            WHERE student_code = ? AND plate = ?
            """,
            (student_code, plate)
        ).fetchone()

        if not existed_vehicle:
            vehicle_data = {}

            if "student_code" in vehicle_columns:
                vehicle_data["student_code"] = student_code

            if "plate" in vehicle_columns:
                vehicle_data["plate"] = plate

            if "vehicle_type" in vehicle_columns:
                vehicle_data["vehicle_type"] = vehicle_type

            if "brand" in vehicle_columns:
                vehicle_data["brand"] = brand

            if "color" in vehicle_columns:
                vehicle_data["color"] = color

            if "is_default" in vehicle_columns:
                vehicle_data["is_default"] = 1

            columns_sql = ", ".join(vehicle_data.keys())
            marks_sql = ", ".join(["?"] * len(vehicle_data))
            values = list(vehicle_data.values())

            conn.execute(
                f"INSERT INTO student_vehicles ({columns_sql}) VALUES ({marks_sql})",
                values
            )

        # Nếu xe này đã đang ở trong bãi thì bỏ qua
        existed_parking = conn.execute(
            """
            SELECT slot_code 
            FROM parking_slots 
            WHERE plate = ? AND status IN ('used', 'car', 'warning')
            """,
            (plate,)
        ).fetchone()

        if existed_parking:
            skipped += 1
            continue

        # Tìm ô trống trong đúng khu
        empty_slot = conn.execute(
            """
            SELECT slot_code 
            FROM parking_slots
            WHERE zone_key = ? AND status = 'empty'
            ORDER BY slot_code ASC
            LIMIT 1
            """,
            (zone_key,)
        ).fetchone()

        if not empty_slot:
            skipped += 1
            continue

        slot_code = empty_slot["slot_code"]
        slot_status = "car" if vehicle_type == "Ô tô" else "used"
        fee = 5000 if vehicle_type == "Ô tô" else 3000

        # Trừ phí ví cho sinh viên
        user_row = conn.execute(
            """
            SELECT balance 
            FROM users 
            WHERE username = ? OR student_code = ?
            """,
            (student_code, student_code)
        ).fetchone()

        balance_before = user_row["balance"] if user_row else 50000
        balance_after = max(0, balance_before - fee)

        conn.execute(
            """
            UPDATE users
            SET balance = ?
            WHERE username = ? OR student_code = ?
            """,
            (balance_after, student_code, student_code)
        )

        # Cập nhật ô gửi xe
        conn.execute(
            """
            UPDATE parking_slots
            SET status = ?,
                plate = ?,
                student_code = ?,
                student_name = ?,
                note = ?,
                updated_at = datetime('now', 'localtime')
            WHERE slot_code = ?
            """,
            (
                slot_status,
                plate,
                student_code,
                full_name,
                "Xe sinh viên đang gửi trong bãi",
                slot_code
            )
        )

        # Ghi lịch sử giao dịch nếu bảng có đủ cột
        transaction_data = {}

        if "student_code" in transaction_columns:
            transaction_data["student_code"] = student_code

        if "student_name" in transaction_columns:
            transaction_data["student_name"] = full_name

        if "plate" in transaction_columns:
            transaction_data["plate"] = plate

        if "slot_code" in transaction_columns:
            transaction_data["slot_code"] = slot_code

        if "zone_key" in transaction_columns:
            transaction_data["zone_key"] = zone_key

        if "action" in transaction_columns:
            transaction_data["action"] = "CHECKIN"

        if "amount" in transaction_columns:
            transaction_data["amount"] = -fee

        if "balance_before" in transaction_columns:
            transaction_data["balance_before"] = balance_before

        if "balance_after" in transaction_columns:
            transaction_data["balance_after"] = balance_after

        if "description" in transaction_columns:
            transaction_data["description"] = "Sinh viên gửi xe, hệ thống trừ phí từ ví"

        if len(transaction_data) > 0:
            columns_sql = ", ".join(transaction_data.keys())
            marks_sql = ", ".join(["?"] * len(transaction_data))
            values = list(transaction_data.values())

            conn.execute(
                f"INSERT INTO parking_transactions ({columns_sql}) VALUES ({marks_sql})",
                values
            )

        added += 1

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Đã bổ sung dữ liệu sinh viên đang gửi xe.",
        "added": added,
        "skipped": skipped
    })


if __name__ == "__main__":
    app.run(debug=True)

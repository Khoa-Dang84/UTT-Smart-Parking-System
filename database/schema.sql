CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    student_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    plate_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('motorbike', 'car')),
    brand TEXT,
    color TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER UNIQUE NOT NULL,
    balance INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('deposit', 'parking_fee', 'refund')),
    status TEXT DEFAULT 'pending',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE TABLE parking_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_code TEXT UNIQUE NOT NULL,
    zone_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('motorbike', 'car')),
    capacity INTEGER NOT NULL
);

CREATE TABLE parking_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL,
    slot_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'empty' CHECK(status IN ('empty', 'occupied', 'warning', 'maintenance')),
    current_vehicle_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES parking_zones(id),
    FOREIGN KEY (current_vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE parking_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    slot_id INTEGER,
    checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    checkout_time DATETIME,
    fee INTEGER DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid',
    status TEXT DEFAULT 'active',
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
);

CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    plate_number TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
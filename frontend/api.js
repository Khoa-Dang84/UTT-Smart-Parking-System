const API_BASE_URL = window.location.origin;

/* =========================
   API REQUEST
========================= */

async function apiRequest(path, options = {}) {
    const response = await fetch(API_BASE_URL + path, options);
    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch (error) {
        throw new Error(
            "Backend trả về HTML hoặc dữ liệu không phải JSON. Kiểm tra route: " + path
        );
    }

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Yêu cầu không thành công");
    }

    return data;
}

async function apiGet(path) {
    return apiRequest(path, {
        method: "GET"
    });
}

async function apiPost(path, body = {}) {
    return apiRequest(path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
}

async function apiDelete(path) {
    return apiRequest(path, {
        method: "DELETE"
    });
}


/* =========================
   LOCAL STORAGE USER
========================= */

function normalizeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id || "",
        username: user.username || "",
        fullName: user.fullName || user.full_name || user.name || "",
        full_name: user.full_name || user.fullName || user.name || "",
        role: user.role || "",
        studentCode: user.studentCode || user.student_code || user.username || "",
        student_code: user.student_code || user.studentCode || user.username || "",
        balance: user.balance || 0,
        loginAt: user.loginAt || new Date().toISOString()
    };
}

function saveLoginSession(user) {
    const normalizedUser = normalizeUser(user);

    localStorage.setItem("smart_utt_current_user", JSON.stringify(normalizedUser));
    localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
    localStorage.setItem("utt_current_user", JSON.stringify(normalizedUser));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", normalizedUser.role);

    return normalizedUser;
}

function getCurrentUser() {
    const keys = [
        "smart_utt_current_user",
        "currentUser",
        "utt_current_user"
    ];

    for (const key of keys) {
        const raw = localStorage.getItem(key);

        if (raw) {
            try {
                return normalizeUser(JSON.parse(raw));
            } catch (error) { }
        }
    }

    return null;
}

function clearLoginSession() {
    localStorage.removeItem("smart_utt_current_user");
    localStorage.removeItem("smart_utt_auth_token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("utt_current_user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
}

function isLoggedIn() {
    const user = getCurrentUser();

    return !!user && !!user.role;
}


/* =========================
   LOGIN / LOGOUT
========================= */

async function loginUser(username, password, role) {
    const data = await apiPost("/api/login", {
        username: username,
        password: password,
        role: role
    });

    const user = data.user;

    if (!user) {
        throw new Error("Backend không trả về thông tin người dùng.");
    }

    if (role && user.role !== role) {
        if (user.role === "admin") {
            throw new Error("Tài khoản này là Admin. Vui lòng chọn tab Admin.");
        }

        if (user.role === "student") {
            throw new Error("Tài khoản này là Sinh viên. Vui lòng chọn tab Sinh viên.");
        }

        throw new Error("Vai trò tài khoản không khớp.");
    }

    const currentUser = saveLoginSession(user);

    if (currentUser.role === "admin") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "student/student-home.html";
    }
}

function logout() {
    const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (!confirmLogout) {
        return;
    }

    clearLoginSession();

    if (window.location.pathname.includes("/student/")) {
        window.location.href = "../login_new.html";
    } else {
        window.location.href = "login_new.html";
    }
}


/* =========================
   ROLE GUARD
========================= */

function requireLogin() {
    if (!isLoggedIn()) {
        alert("Bạn cần đăng nhập trước!");

        if (window.location.pathname.includes("/student/")) {
            window.location.href = "../login_new.html";
        } else {
            window.location.href = "login_new.html";
        }

        return false;
    }

    return true;
}

function requireRole(allowedRoles) {
    const user = getCurrentUser();

    if (!user) {
        alert("Bạn cần đăng nhập trước!");

        if (window.location.pathname.includes("/student/")) {
            window.location.href = "../login_new.html";
        } else {
            window.location.href = "login_new.html";
        }

        return false;
    }

    if (!allowedRoles.includes(user.role)) {
        alert("Tài khoản của bạn không có quyền truy cập trang này.");

        if (user.role === "admin") {
            if (window.location.pathname.includes("/student/")) {
                window.location.href = "../admin-dashboard.html";
            } else {
                window.location.href = "admin-dashboard.html";
            }
        } else {
            if (window.location.pathname.includes("/student/")) {
                window.location.href = "student-home.html";
            } else {
                window.location.href = "student/student-home.html";
            }
        }

        return false;
    }

    return true;
}

function requireStudent() {
    return requireRole(["student"]);
}

function requireAdmin() {
    return requireRole(["admin"]);
}

function guardStudent() {
    return requireStudent();
}

function guardAdmin() {
    return requireAdmin();
}


/* =========================
   UI HELPERS
========================= */

function fillCurrentUserInfo() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    document.querySelectorAll(".current-user-name").forEach(function (element) {
        element.textContent = user.fullName || user.username || "Người dùng";
    });

    document.querySelectorAll(".current-user-code").forEach(function (element) {
        element.textContent = user.studentCode || user.username || "";
    });

    document.querySelectorAll(".current-user-role").forEach(function (element) {
        element.textContent = user.role === "admin" ? "Admin" : "Sinh viên";
    });
}

function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function moneyChange(value) {
    const number = Number(value || 0);

    if (number > 0) {
        return "+" + money(number);
    }

    if (number < 0) {
        return "-" + money(Math.abs(number));
    }

    return "0đ";
}

function moneyChangeClass(value) {
    const number = Number(value || 0);

    if (number > 0) {
        return "money-plus";
    }

    if (number < 0) {
        return "money-minus";
    }

    return "money-zero";
}

function showMessageBox(id, message, ok = true) {
    const box = document.getElementById(id);

    if (!box) {
        return;
    }

    box.textContent = message;
    box.style.display = "block";

    if (ok) {
        box.style.background = "#ecfdf5";
        box.style.color = "#166534";
    } else {
        box.style.background = "#fff1f2";
        box.style.color = "#991b1b";
    }
}

function showMsg(id, text, ok = true) {
    const box = document.getElementById(id);

    if (!box) {
        return;
    }

    box.textContent = text;
    box.className = "message " + (ok ? "success" : "error");
}

function actionLabel(action) {
    if (action === "TOPUP") {
        return '<span class="badge b-money-plus">Nạp tiền</span>';
    }

    if (action === "CHECKIN") {
        return '<span class="badge b-money-minus">Gửi xe / Trừ phí</span>';
    }

    if (action === "CHECKOUT") {
        return '<span class="badge b-out">Lấy xe</span>';
    }

    if (action === "ADMIN_CHECKIN") {
        return '<span class="badge b-in">Admin ghi xe vào</span>';
    }

    if (action === "ADMIN_CHECKOUT") {
        return '<span class="badge b-out">Admin ghi xe ra</span>';
    }

    return '<span class="badge b-warning">' + action + '</span>';
}

function statusText(status) {
    if (status === "empty") return "Còn trống";
    if (status === "used") return "Đang có xe máy";
    if (status === "car") return "Đang có ô tô";
    if (status === "warning") return "Cảnh báo";

    return status || "---";
}

function statusBadge(status) {
    let className = "badge-empty";

    if (status === "used") className = "badge-used";
    if (status === "car") className = "badge-car";
    if (status === "warning") className = "badge-warning";

    return '<span class="badge ' + className + '">' + statusText(status) + '</span>';
}
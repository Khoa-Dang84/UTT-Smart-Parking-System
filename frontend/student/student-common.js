const API_BASE = "/api";

/* =========================
   USER SESSION
========================= */

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

function normalizeUser(user) {
    if (!user) {
        return null;
    }

    return {
        id: user.id || "",
        username: user.username || "",
        fullName: user.fullName || user.full_name || user.name || "Sinh viên",
        full_name: user.full_name || user.fullName || user.name || "Sinh viên",
        role: user.role || "",
        studentCode: user.studentCode || user.student_code || user.username || "",
        student_code: user.student_code || user.studentCode || user.username || "",
        balance: user.balance || 0
    };
}

const currentUser = getCurrentUser();

function guardStudent() {
    if (!currentUser) {
        alert("Bạn cần đăng nhập trước!");
        window.location.href = "../login_new.html";
        return false;
    }

    if (currentUser.role !== "student") {
        alert("Trang này chỉ dành cho sinh viên.");
        window.location.href = "../admin-dashboard.html";
        return false;
    }

    fillCurrentUserInfo();

    return true;
}

function fillCurrentUserInfo() {
    if (!currentUser) {
        return;
    }

    document.querySelectorAll(".current-user-name").forEach(function (element) {
        element.textContent = currentUser.fullName || currentUser.username || "Sinh viên";
    });

    document.querySelectorAll(".current-user-code").forEach(function (element) {
        element.textContent = currentUser.studentCode || currentUser.username || "";
    });

    document.querySelectorAll(".current-user-role").forEach(function (element) {
        element.textContent = "Sinh viên";
    });
}

function logout() {
    const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (!confirmLogout) {
        return;
    }

    localStorage.removeItem("smart_utt_current_user");
    localStorage.removeItem("smart_utt_auth_token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("utt_current_user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");

    window.location.href = "../login_new.html";
}


/* =========================
   API HELPERS
========================= */

async function parseJsonResponse(response, path) {
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
    const response = await fetch(API_BASE + path);

    return parseJsonResponse(response, API_BASE + path);
}

async function apiPost(path, body = {}) {
    const response = await fetch(API_BASE + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    return parseJsonResponse(response, API_BASE + path);
}

async function apiDelete(path) {
    const response = await fetch(API_BASE + path, {
        method: "DELETE"
    });

    return parseJsonResponse(response, API_BASE + path);
}


/* =========================
   FORMAT HELPERS
========================= */

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

function formatDateTime(value) {
    if (!value) {
        return "---";
    }

    return value;
}

function showMsg(id, text, ok = true) {
    const box = document.getElementById(id);

    if (!box) {
        return;
    }

    box.textContent = text;
    box.className = "message " + (ok ? "success" : "error");
}

function clearMsg(id) {
    const box = document.getElementById(id);

    if (!box) {
        return;
    }

    box.textContent = "";
    box.className = "message";
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

    return '<span class="badge b-warning">' + (action || "---") + '</span>';
}

function statusText(status) {
    if (status === "empty") {
        return "Còn trống";
    }

    if (status === "used") {
        return "Đang có xe máy";
    }

    if (status === "car") {
        return "Đang có ô tô";
    }

    if (status === "warning") {
        return "Cảnh báo";
    }

    return status || "---";
}

function statusBadge(status) {
    let className = "badge-empty";

    if (status === "used") {
        className = "badge-used";
    }

    if (status === "car") {
        className = "badge-car";
    }

    if (status === "warning") {
        className = "badge-warning";
    }

    return '<span class="badge ' + className + '">' + statusText(status) + '</span>';
}


/* =========================
   CSV EXPORT
========================= */

function downloadCSV(filename, headers, rows) {
    const csvContent = [headers, ...rows]
        .map(function (row) {
            return row.map(function (value) {
                return '"' + String(value || "").replace(/"/g, '""') + '"';
            }).join(",");
        })
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

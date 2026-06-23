const API_BASE = "/api";

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
                return JSON.parse(raw);
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
        username: user.username || user.studentCode || user.student_code || "",
        fullName: user.fullName || user.full_name || user.name || "Sinh viên",
        role: user.role || "student",
        studentCode: user.studentCode || user.student_code || user.username || ""
    };
}

const currentUser = normalizeUser(getCurrentUser());

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

    document.querySelectorAll(".current-user-name").forEach(function (element) {
        element.textContent = currentUser.fullName;
    });

    document.querySelectorAll(".current-user-code").forEach(function (element) {
        element.textContent = currentUser.studentCode;
    });

    return true;
}

function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

async function apiGet(path) {
    const response = await fetch(API_BASE + path);
    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Yêu cầu không thành công");
    }

    return data;
}

async function apiPost(path, body) {
    const response = await fetch(API_BASE + path, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
        throw new Error(data.message || "Yêu cầu không thành công");
    }

    return data;
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

function showMsg(id, text, ok = true) {
    const box = document.getElementById(id);

    if (!box) {
        return;
    }

    box.textContent = text;
    box.className = "message " + (ok ? "success" : "error");
}

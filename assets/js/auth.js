const AUTH_KEY = "smart_utt_current_user";

const DEMO_USERS = [
    {
        username: "admin",
        password: "123456",
        role: "admin",
        fullName: "Quản trị viên UTT"
    },
    {
        username: "75DCTT21393",
        password: "123456",
        role: "student",
        fullName: "Nguyễn Đăng Khoa"
    },
    {
        username: "student",
        password: "123456",
        role: "student",
        fullName: "Sinh viên UTT"
    }
];

function loginUser(username, password, selectedRole) {
    const user = DEMO_USERS.find(function (item) {
        return item.username === username &&
            item.password === password &&
            item.role === selectedRole;
    });

    if (!user) {
        alert("Sai tài khoản, mật khẩu hoặc vai trò đăng nhập!");
        return;
    }

    localStorage.setItem(AUTH_KEY, JSON.stringify({
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        loginTime: new Date().toISOString()
    }));

    if (user.role === "admin") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "student-home.html";
    }
}

function getCurrentUser() {
    const data = localStorage.getItem(AUTH_KEY);

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        localStorage.removeItem(AUTH_KEY);
        return null;
    }
}

function requireRole(allowedRoles) {
    const user = getCurrentUser();

    if (!user) {
        alert("Bạn cần đăng nhập trước!");
        window.location.href = "login_new.html";
        return;
    }

    if (!allowedRoles.includes(user.role)) {
        alert("Bạn không có quyền truy cập trang này!");

        if (user.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "student-home.html";
        }
    }
}

function logout() {
    const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (confirmLogout) {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = "login_new.html";
    }
}

function showUserInfo() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    document.querySelectorAll(".current-user-name").forEach(function (el) {
        el.textContent = user.fullName || user.username;
    });

    document.querySelectorAll(".current-user-code").forEach(function (el) {
        el.textContent = user.username;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    showUserInfo();
});
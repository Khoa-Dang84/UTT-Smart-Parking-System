const API_BASE_URL = "http://127.0.0.1:5000/api";
const AUTH_TOKEN_KEY = "smart_utt_auth_token";
const AUTH_USER_KEY = "smart_utt_current_user";

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function getCurrentUser() {
    const data = localStorage.getItem(AUTH_USER_KEY);

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch (error) {
        clearAuthSession();
        return null;
    }
}

async function apiRequest(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    const token = getAuthToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    });

    const payload = await response.json().catch(function () {
        return { success: false, message: "Phản hồi máy chủ không hợp lệ." };
    });

    if (!response.ok || payload.success === false) {
        const message = payload.message || "Yêu cầu không thành công.";
        throw new Error(message);
    }

    return payload.data || {};
}

async function loginUser(username, password, selectedRole) {
    try {
        const data = await apiRequest("/login", {
            method: "POST",
            body: JSON.stringify({
                username,
                password,
                role: selectedRole
            })
        });

        setAuthSession(data.token, data.user);

        if (data.user.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "student-home.html";
        }
    } catch (error) {
        alert(error.message);
    }
}

async function logout() {
    const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (!confirmLogout) {
        return;
    }

    try {
        await apiRequest("/logout", { method: "POST" });
    } catch (error) {
    }

    clearAuthSession();
    window.location.href = "login_new.html";
}

function requireRole(allowedRoles) {
    const user = getCurrentUser();
    const token = getAuthToken();

    if (!user || !token) {
        alert("Bạn cần đăng nhập trước.");
        window.location.href = "login_new.html";
        return;
    }

    if (!allowedRoles.includes(user.role)) {
        alert("Bạn không có quyền truy cập trang này.");

        if (user.role === "admin") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "student-home.html";
        }

        return;
    }

    apiRequest("/me")
        .then(function (data) {
            if (data.user) {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
                showCurrentUser();
            }
        })
        .catch(function () {
            clearAuthSession();
            alert("Phiên đăng nhập đã hết hạn.");
            window.location.href = "login_new.html";
        });
}

function showCurrentUser() {
    const user = getCurrentUser();

    if (!user) {
        return;
    }

    document.querySelectorAll(".current-user-name").forEach(function (element) {
        element.textContent = user.fullName || user.username;
    });

    document.querySelectorAll(".current-user-code").forEach(function (element) {
        element.textContent = user.studentCode || user.username;
    });

    document.querySelectorAll(".current-user-role").forEach(function (element) {
        element.textContent = user.role === "admin" ? "Quản trị viên" : "Sinh viên";
    });
}

function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("vi-VN") + "đ";
}

const SmartParkingAPI = {
    health: function () {
        return apiRequest("/health");
    },

    me: function () {
        return apiRequest("/me");
    },

    studentHome: function () {
        return apiRequest("/student/home");
    },

    listVehicles: function () {
        return apiRequest("/student/vehicles");
    },

    createVehicle: function (vehicle) {
        return apiRequest("/student/vehicles", {
            method: "POST",
            body: JSON.stringify(vehicle)
        });
    },

    updateVehicle: function (id, vehicle) {
        return apiRequest(`/student/vehicles/${id}`, {
            method: "PUT",
            body: JSON.stringify(vehicle)
        });
    },

    deleteVehicle: function (id) {
        return apiRequest(`/student/vehicles/${id}`, {
            method: "DELETE"
        });
    },

    setMainVehicle: function (id) {
        return apiRequest(`/student/vehicles/${id}/main`, {
            method: "POST"
        });
    },

    getWallet: function () {
        return apiRequest("/student/wallet");
    },

    requestTopup: function (amount, method) {
        return apiRequest("/student/wallet/topup", {
            method: "POST",
            body: JSON.stringify({ amount, method })
        });
    },

    getStudentHistory: function () {
        return apiRequest("/student/history");
    },

    parkingSummary: function () {
        return apiRequest("/parking/summary");
    },

    parkingZones: function () {
        return apiRequest("/parking/zones");
    },

    parkingSlots: function (zoneCode = "") {
        const query = zoneCode ? `?zone_code=${encodeURIComponent(zoneCode)}` : "";
        return apiRequest(`/parking/slots${query}`);
    },

    checkin: function (plate, zoneCode = "") {
        return apiRequest("/parking/checkin", {
            method: "POST",
            body: JSON.stringify({ plate, zoneCode })
        });
    },

    checkout: function (plate) {
        return apiRequest("/parking/checkout", {
            method: "POST",
            body: JSON.stringify({ plate })
        });
    },

    adminDashboard: function () {
        return apiRequest("/admin/dashboard");
    },

    adminTransactions: function () {
        return apiRequest("/admin/transactions");
    },

    approveTransaction: function (id) {
        return apiRequest(`/admin/transactions/${id}/approve`, {
            method: "POST"
        });
    },

    rejectTransaction: function (id) {
        return apiRequest(`/admin/transactions/${id}/reject`, {
            method: "POST"
        });
    },

    adminStudents: function () {
        return apiRequest("/admin/students");
    },

    adminVehicles: function () {
        return apiRequest("/admin/vehicles");
    }
};

document.addEventListener("DOMContentLoaded", function () {
    showCurrentUser();
});

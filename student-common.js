/* ============================================================
   Smart UTT Parking - student-common.js
   Bản sửa triệt để cho trang sinh viên
   Không gọi Flask /api nữa, chuyển sang gọi api.js Supabase
============================================================ */

function normalizeUser(user) {
  if (!user) return null;

  return {
    id: user.id || "",
    username: user.username || "",
    fullName: user.fullName || user.full_name || user.name || "Sinh viên",
    full_name: user.full_name || user.fullName || user.name || "Sinh viên",
    role: user.role || "",
    studentCode: user.studentCode || user.student_code || user.username || "",
    student_code: user.student_code || user.studentCode || user.username || "",
    balance: Number(user.balance || 0),
    phone: user.phone || "",
    department: user.department || ""
  };
}

function getCurrentUser() {
  const keys = ["smart_utt_current_user", "currentUser", "utt_current_user"];

  for (const key of keys) {
    const raw = localStorage.getItem(key);

    if (!raw) continue;

    try {
      const user = normalizeUser(JSON.parse(raw));

      if (user && user.role) {
        return user;
      }
    } catch (error) {}
  }

  return null;
}

var currentUser = getCurrentUser();

function guardStudent() {
  if (!currentUser) {
    alert("Bạn cần đăng nhập trước!");
    window.location.href = "login_new.html";
    return false;
  }

  if (currentUser.role !== "student") {
    alert("Trang này chỉ dành cho sinh viên.");
    window.location.href = "admin-dashboard.html";
    return false;
  }

  fillCurrentUserInfo();
  return true;
}

function fillCurrentUserInfo() {
  if (!currentUser) return;

  document.querySelectorAll(".current-user-name").forEach(function (element) {
    element.textContent = currentUser.fullName || currentUser.username || "Sinh viên";
  });

  document.querySelectorAll(".current-user-code").forEach(function (element) {
    element.textContent = currentUser.studentCode || currentUser.username || "";
  });

  document.querySelectorAll(".current-user-role").forEach(function (element) {
    element.textContent = "Sinh viên";
  });

  document.querySelectorAll(".current-user-balance").forEach(function (element) {
    element.textContent = money(currentUser.balance || 0);
  });
}

function logout() {
  const confirmLogout = confirm("Bạn có chắc chắn muốn đăng xuất không?");

  if (!confirmLogout) return;

  localStorage.removeItem("smart_utt_current_user");
  localStorage.removeItem("smart_utt_auth_token");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("utt_current_user");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userRole");

  window.location.href = "login_new.html";
}

/* ============================================================
   Load api.js nếu trang chưa load
============================================================ */

function loadSmartUttApi() {
  return new Promise(function (resolve, reject) {
    if (window.smartUttApiGet && window.smartUttApiPost && window.smartUttApiDelete) {
      resolve();
      return;
    }

    const existedScript = document.querySelector('script[data-smart-utt-api-fix]');

    if (existedScript) {
      existedScript.addEventListener("load", resolve);
      existedScript.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "api.js?v=" + Date.now();
    script.setAttribute("data-smart-utt-api-fix", "true");

    script.onload = function () {
      resolve();
    };

    script.onerror = function () {
      reject(new Error("Không tải được file api.js."));
    };

    document.head.appendChild(script);
  });
}

/* ============================================================
   Ghi đè apiGet/apiPost/apiDelete cũ
   Mục tiêu: không gọi /api/student/... nữa
============================================================ */

async function apiGet(path) {
  await loadSmartUttApi();

  if (window.smartUttApiGet) {
    return await window.smartUttApiGet(path);
  }

  if (window.apiGet && window.apiGet !== apiGet) {
    return await window.apiGet(path);
  }

  throw new Error("Supabase API chưa sẵn sàng. Kiểm tra file api.js.");
}

async function apiPost(path, body = {}) {
  await loadSmartUttApi();

  if (window.smartUttApiPost) {
    return await window.smartUttApiPost(path, body);
  }

  if (window.apiPost && window.apiPost !== apiPost) {
    return await window.apiPost(path, body);
  }

  throw new Error("Supabase API chưa sẵn sàng. Kiểm tra file api.js.");
}

async function apiDelete(path) {
  await loadSmartUttApi();

  if (window.smartUttApiDelete) {
    return await window.smartUttApiDelete(path);
  }

  if (window.apiDelete && window.apiDelete !== apiDelete) {
    return await window.apiDelete(path);
  }

  throw new Error("Supabase API chưa sẵn sàng. Kiểm tra file api.js.");
}

/* ============================================================
   Helper hiển thị tiền, ngày, trạng thái
============================================================ */

function money(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function moneyVND(value) {
  return money(value);
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
  if (!value) return "---";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function actionLabel(action) {
  if (action === "TOPUP") return "Nạp tiền";
  if (action === "CHECKIN") return "Gửi xe / Trừ phí";
  if (action === "CHECKOUT") return "Lấy xe";
  if (action === "ADMIN_CHECKIN") return "Admin ghi xe vào";
  if (action === "ADMIN_CHECKOUT") return "Admin ghi xe ra";

  return action || "---";
}

function statusText(status) {
  if (status === "empty") return "Còn trống";
  if (status === "used") return "Đang có xe máy";
  if (status === "car") return "Đang có ô tô";
  if (status === "warning") return "Cảnh báo";
  if (status === "parking") return "Đang gửi";
  if (status === "outside") return "Chưa gửi";

  return status || "---";
}

function statusBadge(status) {
  let className = "badge-empty";

  if (status === "used" || status === "parking") {
    className = "badge-used";
  }

  if (status === "car") {
    className = "badge-car";
  }

  if (status === "warning") {
    className = "badge-warning";
  }

  return '<span class="badge ' + className + '">' + statusText(status) + "</span>";
}

/* ============================================================
   Message box
============================================================ */

function showMsg(id, text, ok = true) {
  const box = document.getElementById(id);

  if (!box) return;

  box.textContent = text || "";
  box.className = "message " + (ok ? "success" : "error");

  if (!text) {
    box.className = "message";
  }
}

function clearMsg(id) {
  const box = document.getElementById(id);

  if (!box) return;

  box.textContent = "";
  box.className = "message";
}

/* ============================================================
   CSV export
============================================================ */

function downloadCSV(filename, headers, rows) {
  const csvContent = [headers, ...rows]
    .map(function (row) {
      return row
        .map(function (value) {
          return '"' + String(value || "").replace(/"/g, '""') + '"';
        })
        .join(",");
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

/* ============================================================
   Điều hướng nhanh
============================================================ */

function goToPage(page) {
  window.location.href = page;
}

/* ============================================================
   Xuất hàm ra window để các file HTML dùng được
============================================================ */

window.normalizeUser = normalizeUser;
window.getCurrentUser = getCurrentUser;
window.currentUser = currentUser;
window.guardStudent = guardStudent;
window.fillCurrentUserInfo = fillCurrentUserInfo;
window.logout = logout;

window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiDelete = apiDelete;

window.money = money;
window.moneyVND = moneyVND;
window.moneyChange = moneyChange;
window.moneyChangeClass = moneyChangeClass;
window.formatDateTime = formatDateTime;
window.actionLabel = actionLabel;
window.statusText = statusText;
window.statusBadge = statusBadge;

window.showMsg = showMsg;
window.clearMsg = clearMsg;
window.downloadCSV = downloadCSV;
window.goToPage = goToPage;

console.log("✅ student-common.js đã dùng Supabase API, không gọi Flask /api nữa");

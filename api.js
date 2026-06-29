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
/* =========================
   GITHUB PAGES MODE
   Giúp website chạy được trên GitHub Pages
========================= */
(function () {
  const isGitHubPages = location.hostname.includes("github.io");

  if (!isGitHubPages) {
    return;
  }

  const DATA_KEY = "smart_utt_pages_data";

  function getDefaultData() {
    return {
      users: [
        {
          id: 1,
          username: "admin",
          password: "admin123",
          full_name: "Admin UTT",
          fullName: "Admin UTT",
          role: "admin",
          student_code: "",
          studentCode: "",
          balance: 0
        },
        {
          id: 2,
          username: "75DCTT21393",
          password: "123456",
          full_name: "Nguyễn Đăng Khoa",
          fullName: "Nguyễn Đăng Khoa",
          role: "student",
          student_code: "75DCTT21393",
          studentCode: "75DCTT21393",
          balance: 50000
        },
        {
          id: 3,
          username: "75DCTT21001",
          password: "123456",
          full_name: "Nguyễn Văn An",
          fullName: "Nguyễn Văn An",
          role: "student",
          student_code: "75DCTT21001",
          studentCode: "75DCTT21001",
          balance: 50000
        }
      ],

      vehicles: [
        {
          id: 1,
          student_code: "75DCTT21393",
          studentCode: "75DCTT21393",
          owner_name: "Nguyễn Đăng Khoa",
          ownerName: "Nguyễn Đăng Khoa",
          plate: "29X1-21393",
          vehicle_type: "Xe máy",
          vehicleType: "Xe máy",
          brand: "Honda",
          color: "Đen",
          status: "outside",
          is_default: 1
        },
        {
          id: 2,
          student_code: "75DCTT21001",
          studentCode: "75DCTT21001",
          owner_name: "Nguyễn Văn An",
          ownerName: "Nguyễn Văn An",
          plate: "29X1-21001",
          vehicle_type: "Xe máy",
          vehicleType: "Xe máy",
          brand: "Yamaha",
          color: "Xanh",
          status: "outside",
          is_default: 1
        }
      ],

      zones: [
        {
          id: "student1",
          zoneKey: "student1",
          zone_key: "student1",
          name: "Khu gửi xe 1",
          zoneName: "Khu gửi xe 1",
          zone_name: "Khu gửi xe 1",
          vehicleType: "Xe máy",
          vehicle_type: "Xe máy",
          totalSlots: 20,
          total_slots: 20,
          emptySlots: 15,
          empty_slots: 15,
          usedSlots: 5,
          used_slots: 5,
          availableSlots: 15,
          occupiedSlots: 5
        },
        {
          id: "bike2",
          zoneKey: "bike2",
          zone_key: "bike2",
          name: "Khu gửi xe 2",
          zoneName: "Khu gửi xe 2",
          zone_name: "Khu gửi xe 2",
          vehicleType: "Xe máy",
          vehicle_type: "Xe máy",
          totalSlots: 20,
          total_slots: 20,
          emptySlots: 16,
          empty_slots: 16,
          usedSlots: 4,
          used_slots: 4,
          availableSlots: 16,
          occupiedSlots: 4
        },
        {
          id: "bike3",
          zoneKey: "bike3",
          zone_key: "bike3",
          name: "Khu gửi xe 3",
          zoneName: "Khu gửi xe 3",
          zone_name: "Khu gửi xe 3",
          vehicleType: "Xe máy",
          vehicle_type: "Xe máy",
          totalSlots: 20,
          total_slots: 20,
          emptySlots: 17,
          empty_slots: 17,
          usedSlots: 3,
          used_slots: 3,
          availableSlots: 17,
          occupiedSlots: 3
        },
        {
          id: "teacher",
          zoneKey: "teacher",
          zone_key: "teacher",
          name: "Khu giáo viên",
          zoneName: "Khu giáo viên",
          zone_name: "Khu giáo viên",
          vehicleType: "Xe máy",
          vehicle_type: "Xe máy",
          totalSlots: 20,
          total_slots: 20,
          emptySlots: 18,
          empty_slots: 18,
          usedSlots: 2,
          used_slots: 2,
          availableSlots: 18,
          occupiedSlots: 2
        },
        {
          id: "car",
          zoneKey: "car",
          zone_key: "car",
          name: "Khu ô tô",
          zoneName: "Khu ô tô",
          zone_name: "Khu ô tô",
          vehicleType: "Ô tô",
          vehicle_type: "Ô tô",
          totalSlots: 20,
          total_slots: 20,
          emptySlots: 19,
          empty_slots: 19,
          usedSlots: 1,
          used_slots: 1,
          availableSlots: 19,
          occupiedSlots: 1
        }
      ],

      slots: [],
      history: []
    };
  }

  function loadData() {
    const raw = localStorage.getItem(DATA_KEY);

    if (!raw) {
      const data = getDefaultData();
      data.slots = createSlots(data.zones);
      saveData(data);
      return data;
    }

    try {
      const data = JSON.parse(raw);

      if (!Array.isArray(data.slots) || data.slots.length === 0) {
        data.slots = createSlots(data.zones || getDefaultData().zones);
      }

      return data;
    } catch (error) {
      const data = getDefaultData();
      data.slots = createSlots(data.zones);
      saveData(data);
      return data;
    }
  }

  function saveData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function createSlots(zones) {
    const result = [];

    zones.forEach(function (zone) {
      const prefixMap = {
        student1: "SV1",
        bike2: "SV2",
        bike3: "SV3",
        teacher: "GV",
        car: "OTO"
      };

      const prefix = prefixMap[zone.zoneKey] || "S";

      for (let i = 1; i <= zone.totalSlots; i++) {
        result.push({
          id: result.length + 1,
          slotCode: prefix + String(i).padStart(3, "0"),
          slot_code: prefix + String(i).padStart(3, "0"),
          zoneKey: zone.zoneKey,
          zone_key: zone.zoneKey,
          zoneName: zone.zoneName,
          zone_name: zone.zoneName,
          vehicleType: zone.vehicleType,
          vehicle_type: zone.vehicleType,
          status: i <= zone.usedSlots ? "used" : "empty",
          plate: i <= zone.usedSlots ? "29X1-" + (10000 + i) : "",
          studentCode: i <= zone.usedSlots ? "75DCTT2100" + i : "",
          student_code: i <= zone.usedSlots ? "75DCTT2100" + i : "",
          studentName: i <= zone.usedSlots ? "Sinh viên kiểm thử " + i : "",
          student_name: i <= zone.usedSlots ? "Sinh viên kiểm thử " + i : "",
          phone: "09" + Math.floor(10000000 + Math.random() * 89999999),
          updatedAt: new Date().toLocaleString("vi-VN")
        });
      }
    });

    return result;
  }

  function parseBody(options) {
    try {
      return JSON.parse(options.body || "{}");
    } catch (error) {
      return {};
    }
  }

  function getCurrentStudentCode() {
    const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
    return user ? user.studentCode || user.student_code || user.username : "";
  }

  function getStats(data) {
    const totalSlots = data.slots.length;
    const usedSlots = data.slots.filter(function (slot) {
      return slot.status !== "empty";
    }).length;
    const emptySlots = totalSlots - usedSlots;

    const todayRevenue = data.history
      .filter(function (item) {
        return item.action === "CHECKIN" || item.action === "ADMIN_CHECKIN";
      })
      .reduce(function (sum, item) {
        return sum + Number(item.fee || 0);
      }, 0);

    return {
      success: true,
      totalSlots: totalSlots,
      emptySlots: emptySlots,
      availableSlots: emptySlots,
      usedSlots: usedSlots,
      occupiedSlots: usedSlots,
      warningSlots: 0,
      todayRevenue: todayRevenue
    };
  }

  function refreshZones(data) {
    data.zones.forEach(function (zone) {
      const zoneSlots = data.slots.filter(function (slot) {
        return slot.zoneKey === zone.zoneKey || slot.zone_key === zone.zoneKey;
      });

      const used = zoneSlots.filter(function (slot) {
        return slot.status !== "empty";
      }).length;

      const empty = zoneSlots.length - used;

      zone.totalSlots = zoneSlots.length;
      zone.total_slots = zoneSlots.length;
      zone.usedSlots = used;
      zone.used_slots = used;
      zone.occupiedSlots = used;
      zone.emptySlots = empty;
      zone.empty_slots = empty;
      zone.availableSlots = empty;
    });
  }

  async function pagesApiRequest(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body = parseBody(options);
    const data = loadData();

    if (path === "/api/login" && method === "POST") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "").trim();
      const role = String(body.role || "").trim();

      const user = data.users.find(function (item) {
        return item.username === username && item.password === password;
      });

      if (!user) {
        return {
          success: false,
          message: "Sai tài khoản hoặc mật khẩu"
        };
      }

      if (role && user.role !== role) {
        return {
          success: false,
          message: "Vai trò đăng nhập không khớp với tài khoản"
        };
      }

      return {
        success: true,
        message: "Đăng nhập thành công",
        user: user
      };
    }

    if (path.includes("/api/stats")) {
      refreshZones(data);
      saveData(data);
      return getStats(data);
    }

    if (path.includes("/api/parking-lots") || path.includes("/api/student/parking/zones")) {
      refreshZones(data);
      saveData(data);

      if (path.includes("/api/student/parking/zones")) {
        return {
          success: true,
          zones: data.zones
        };
      }

      return data.zones;
    }

    if (path.includes("/api/admin/dashboard")) {
      refreshZones(data);
      saveData(data);

      const usedSlots = data.slots.filter(function (slot) {
        return slot.status !== "empty";
      });

      return {
        success: true,
        stats: getStats(data),
        zones: data.zones,
        recent: usedSlots.slice(0, 20),
        alerts: []
      };
    }

    if (path.includes("/api/slots")) {
      const url = new URL(path, location.origin);
      const zoneKey = url.searchParams.get("zoneKey") || url.searchParams.get("zone_key");

      let slots = data.slots;

      if (zoneKey) {
        slots = slots.filter(function (slot) {
          return slot.zoneKey === zoneKey || slot.zone_key === zoneKey;
        });
      }

      return {
        success: true,
        slots: slots
      };
    }

    if (path.includes("/api/student/vehicles")) {
      const studentCode = getCurrentStudentCode();

      return {
        success: true,
        vehicles: data.vehicles.filter(function (vehicle) {
          return vehicle.student_code === studentCode || vehicle.studentCode === studentCode;
        })
      };
    }

    if (path.includes("/api/student/wallet/topup") || path.includes("/api/wallet/topup")) {
      const amount = Number(body.amount || 0);
      const studentCode = getCurrentStudentCode();

      const user = data.users.find(function (item) {
        return item.student_code === studentCode || item.username === studentCode;
      });

      if (!user || amount <= 0) {
        return {
          success: false,
          message: "Số tiền nạp không hợp lệ"
        };
      }

      const before = Number(user.balance || 0);
      user.balance = before + amount;

      data.history.unshift({
        id: Date.now(),
        action: "TOPUP",
        amount: amount,
        fee: 0,
        balance_before: before,
        balance_after: user.balance,
        description: "Nạp tiền vào ví",
        created_at: new Date().toLocaleString("vi-VN")
      });

      saveData(data);
      saveLoginSession(user);

      return {
        success: true,
        message: "Nạp tiền thành công",
        balance: user.balance,
        user: user
      };
    }

    if (
      path.includes("/api/student/history") ||
      path.includes("/api/history") ||
      path.includes("/api/transactions")
    ) {
      return {
        success: true,
        history: data.history,
        transactions: data.history
      };
    }

    if (path.includes("/api/student/parking/checkin") || path.includes("/api/vehicle/in")) {
      const studentCode = getCurrentStudentCode();
      const plate = String(body.plate || "").trim().toUpperCase();
      const zoneKey = body.zoneKey || body.zone_key || "student1";

      const user = data.users.find(function (item) {
        return item.student_code === studentCode || item.username === studentCode;
      });

      const vehicle = data.vehicles.find(function (item) {
        return (item.student_code === studentCode || item.studentCode === studentCode) && item.plate === plate;
      });

      if (!user) {
        return {
          success: false,
          message: "Không tìm thấy tài khoản sinh viên"
        };
      }

      if (!vehicle) {
        return {
          success: false,
          message: "Xe này chưa được khai báo trong mục Xe của tôi"
        };
      }

      const fee = vehicle.vehicle_type === "Ô tô" || vehicle.vehicleType === "Ô tô" ? 5000 : 3000;

      if (Number(user.balance || 0) < fee) {
        return {
          success: false,
          message: "Số dư không đủ, vui lòng nạp thêm tiền"
        };
      }

      const slot = data.slots.find(function (item) {
        return (item.zoneKey === zoneKey || item.zone_key === zoneKey) && item.status === "empty";
      });

      if (!slot) {
        return {
          success: false,
          message: "Khu này hiện không còn chỗ trống"
        };
      }

      const before = Number(user.balance || 0);
      user.balance = before - fee;

      slot.status = vehicle.vehicle_type === "Ô tô" || vehicle.vehicleType === "Ô tô" ? "car" : "used";
      slot.plate = plate;
      slot.studentCode = studentCode;
      slot.student_code = studentCode;
      slot.studentName = user.full_name || user.fullName || user.username;
      slot.student_name = user.full_name || user.fullName || user.username;
      slot.updatedAt = new Date().toLocaleString("vi-VN");

      vehicle.status = "parking";
      vehicle.slotCode = slot.slotCode;
      vehicle.slot_code = slot.slotCode;
      vehicle.zoneName = slot.zoneName;
      vehicle.zone_name = slot.zoneName;

      data.history.unshift({
        id: Date.now(),
        action: "CHECKIN",
        fee: fee,
        amount: -fee,
        plate: plate,
        slot_code: slot.slotCode,
        slotCode: slot.slotCode,
        zone_name: slot.zoneName,
        zoneName: slot.zoneName,
        balance_before: before,
        balance_after: user.balance,
        description: "Gửi xe tại " + slot.zoneName,
        created_at: new Date().toLocaleString("vi-VN")
      });

      refreshZones(data);
      saveData(data);
      saveLoginSession(user);

      return {
        success: true,
        message: "Gửi xe thành công",
        slot: slot,
        user: user
      };
    }

    if (path.includes("/api/student/parking/checkout") || path.includes("/api/vehicle/out")) {
      const studentCode = getCurrentStudentCode();
      const plate = String(body.plate || "").trim().toUpperCase();

      const slot = data.slots.find(function (item) {
        return item.plate === plate && item.status !== "empty";
      });

      const vehicle = data.vehicles.find(function (item) {
        return item.plate === plate && (item.student_code === studentCode || item.studentCode === studentCode);
      });

      if (!slot) {
        return {
          success: false,
          message: "Xe này hiện không có trong bãi"
        };
      }

      data.history.unshift({
        id: Date.now(),
        action: "CHECKOUT",
        fee: 0,
        amount: 0,
        plate: plate,
        slot_code: slot.slotCode,
        slotCode: slot.slotCode,
        zone_name: slot.zoneName,
        zoneName: slot.zoneName,
        description: "Lấy xe khỏi bãi",
        created_at: new Date().toLocaleString("vi-VN")
      });

      slot.status = "empty";
      slot.plate = "";
      slot.studentCode = "";
      slot.student_code = "";
      slot.studentName = "";
      slot.student_name = "";

      if (vehicle) {
        vehicle.status = "outside";
        vehicle.slotCode = "";
        vehicle.slot_code = "";
        vehicle.zoneName = "";
        vehicle.zone_name = "";
      }

      refreshZones(data);
      saveData(data);

      return {
        success: true,
        message: "Lấy xe thành công"
      };
    }

    return {
      success: true,
      message: "GitHub Pages đã xử lý yêu cầu",
      data: data
    };
  }

  window.apiRequest = pagesApiRequest;

  window.apiGet = function (path) {
    return pagesApiRequest(path, {
      method: "GET"
    });
  };

  window.apiPost = function (path, body = {}) {
    return pagesApiRequest(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  };

  window.apiDelete = function (path) {
    return pagesApiRequest(path, {
      method: "DELETE"
    });
  };

  window.loginUser = async function (username, password, role) {
    const result = await window.apiPost("/api/login", {
      username: username,
      password: password,
      role: role
    });

    if (!result.success) {
      throw new Error(result.message || "Đăng nhập không thành công");
    }

    const user = result.user;

    if (typeof saveLoginSession === "function") {
      saveLoginSession(user);
    } else {
      localStorage.setItem("smart_utt_current_user", JSON.stringify(user));
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("utt_current_user", JSON.stringify(user));
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", user.role);
    }

    if (user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "student-home.html";
    }
  };
})();

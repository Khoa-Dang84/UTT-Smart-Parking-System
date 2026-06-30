/* ============================================================
   Smart UTT Parking - api.js
   Bản ổn định cho GitHub Pages + Supabase
   Sửa lỗi: trang chủ 0 dữ liệu, admin 0 dữ liệu, sinh viên không gửi xe được
============================================================ */

const SUPABASE_URL = "https://znqtskbjbvayrqipamqa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0MyC0DLeoH12tQ4g5mWulg_w3CqSOyJ";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

let smartUttSupabaseClient = null;

function moneyVND(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function money(value) {
  return moneyVND(value);
}

function formatDateTime(value) {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function normalizePath(path) {
  if (!path) return "/";
  try {
    const url = new URL(String(path), location.origin);
    return url.pathname + url.search;
  } catch (error) {
    return String(path);
  }
}

function getQueryParam(path, key) {
  try {
    const url = new URL(path, location.origin);
    return url.searchParams.get(key);
  } catch (error) {
    return null;
  }
}

function loadSupabaseScript() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const existed = document.querySelector("script[data-smart-utt-supabase]");

    if (existed) {
      existed.addEventListener("load", resolve);
      existed.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = SUPABASE_CDN;
    script.async = true;
    script.setAttribute("data-smart-utt-supabase", "true");
    script.onload = resolve;
    script.onerror = function () {
      reject(new Error("Không tải được thư viện Supabase."));
    };

    document.head.appendChild(script);
  });
}

async function getSupabaseClient() {
  if (smartUttSupabaseClient) return smartUttSupabaseClient;

  if (!SUPABASE_URL || SUPABASE_URL.includes("/rest/v1")) {
    throw new Error("SUPABASE_URL đang sai. Chỉ dùng dạng https://xxx.supabase.co, không có /rest/v1/");
  }

  await loadSupabaseScript();
  smartUttSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return smartUttSupabaseClient;
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(text));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeUser(user, wallet) {
  if (!user) return null;

  const studentCode = user.student_code || user.studentCode || user.username || "";

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name || user.fullName || user.username,
    fullName: user.full_name || user.fullName || user.username,
    student_code: studentCode,
    studentCode: studentCode,
    phone: user.phone || "",
    department: user.department || "",
    balance: wallet ? Number(wallet.balance || 0) : Number(user.balance || 0)
  };
}

function saveLoginSession(user) {
  const normalized = normalizeUser(user, { balance: user.balance || 0 });

  localStorage.setItem("smart_utt_current_user", JSON.stringify(normalized));
  localStorage.setItem("currentUser", JSON.stringify(normalized));
  localStorage.setItem("utt_current_user", JSON.stringify(normalized));
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", normalized.role);

  return normalized;
}

function getCurrentUser() {
  const keys = ["smart_utt_current_user", "currentUser", "utt_current_user"];

  for (const key of keys) {
    const raw = localStorage.getItem(key);

    if (!raw) continue;

    try {
      const user = JSON.parse(raw);
      if (user && user.role) return normalizeUser(user);
    } catch (error) {}
  }

  return null;
}

function logout() {
  localStorage.removeItem("smart_utt_current_user");
  localStorage.removeItem("smart_utt_auth_token");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("utt_current_user");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userRole");

  window.location.href = "login_new.html";
}

function requireAuth(requiredRole) {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "login_new.html";
    return null;
  }

  if (requiredRole && user.role !== requiredRole) {
    window.location.href = user.role === "admin" ? "admin-dashboard.html" : "student-home.html";
    return null;
  }

  return user;
}

function guardAdmin() {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "login_new.html";
    return false;
  }

  if (user.role !== "admin") {
    window.location.href = "student-home.html";
    return false;
  }

  return true;
}

async function getCurrentDbUser() {
  const sessionUser = getCurrentUser();

  if (!sessionUser) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", sessionUser.id)
    .single();

  if (error || !data) {
    throw new Error("Không tìm thấy tài khoản đang đăng nhập.");
  }

  return data;
}

async function getWalletByUserId(userId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Không lấy được ví người dùng.");
  }

  return data;
}

async function loginUser(username, password, role) {
  const supabase = await getSupabaseClient();
  const passwordHash = await sha256(password);

  const { data: user, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", String(username).trim())
    .single();

  if (error || !user) {
    throw new Error("Sai tài khoản hoặc mật khẩu.");
  }

  if (user.password_hash !== passwordHash) {
    throw new Error("Sai tài khoản hoặc mật khẩu.");
  }

  if (role && user.role !== role) {
    throw new Error("Vai trò đăng nhập không khớp với tài khoản.");
  }

  let wallet = null;

  if (user.role === "student") {
    wallet = await getWalletByUserId(user.id);
  }

  saveLoginSession(normalizeUser(user, wallet));

  if (user.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "student-home.html";
  }
}

async function getStats() {
  const supabase = await getSupabaseClient();

  const { data: slots, error: slotError } = await supabase
    .from("parking_slots")
    .select("*");

  if (slotError) throw new Error(slotError.message);

  const totalSlots = slots.length;
  const usedSlots = slots.filter((slot) => slot.status !== "empty").length;
  const emptySlots = totalSlots - usedSlots;
  const warningSlots = slots.filter((slot) => slot.status === "warning").length;

  const { data: txs } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .eq("type", "CHECKIN");

  const today = new Date().toLocaleDateString("vi-VN");

  const todayRevenue = (txs || [])
    .filter((tx) => new Date(tx.created_at).toLocaleDateString("vi-VN") === today)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  return {
    success: true,
    totalSlots: totalSlots,
    emptySlots: emptySlots,
    availableSlots: emptySlots,
    usedSlots: usedSlots,
    occupiedSlots: usedSlots,
    warningSlots: warningSlots,
    todayRevenue: todayRevenue,
    usageRate: totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0
  };
}

async function getZonesWithCounts() {
  const supabase = await getSupabaseClient();

  const { data: zones, error: zoneError } = await supabase
    .from("parking_zones")
    .select("*")
    .order("name", { ascending: true });

  if (zoneError) throw new Error(zoneError.message);

  const { data: slots, error: slotError } = await supabase
    .from("parking_slots")
    .select("*");

  if (slotError) throw new Error(slotError.message);

  return (zones || []).map((zone) => {
    const zoneSlots = slots.filter((slot) => slot.zone_id === zone.id);
    const usedSlots = zoneSlots.filter((slot) => slot.status !== "empty").length;
    const emptySlots = zoneSlots.length - usedSlots;

    return {
      id: zone.id,
      zoneKey: zone.id,
      zone_key: zone.id,
      name: zone.name,
      zoneName: zone.name,
      zone_name: zone.name,
      vehicleType: zone.vehicle_type,
      vehicle_type: zone.vehicle_type,
      totalSlots: zoneSlots.length || Number(zone.total_slots || 0),
      total_slots: zoneSlots.length || Number(zone.total_slots || 0),
      usedSlots: usedSlots,
      used_slots: usedSlots,
      occupiedSlots: usedSlots,
      emptySlots: emptySlots,
      empty_slots: emptySlots,
      availableSlots: emptySlots
    };
  });
}

function normalizeSlot(slot) {
  const zoneName = slot.parking_zones?.name || slot.zone_id || "---";
  const vehicleType = slot.vehicles?.vehicle_type || slot.parking_zones?.vehicle_type || "---";

  return {
    id: slot.id,
    slotCode: slot.slot_code,
    slot_code: slot.slot_code,
    zoneKey: slot.zone_id,
    zone_key: slot.zone_id,
    zoneName: zoneName,
    zone_name: zoneName,
    status: slot.status,
    plate: slot.plate || slot.vehicles?.plate || "",
    studentName: slot.app_users?.full_name || "",
    student_name: slot.app_users?.full_name || "",
    studentCode: slot.app_users?.student_code || slot.app_users?.username || "",
    student_code: slot.app_users?.student_code || slot.app_users?.username || "",
    phone: slot.app_users?.phone || "",
    vehicleType: vehicleType,
    vehicle_type: vehicleType,
    brand: slot.vehicles?.brand || "",
    color: slot.vehicles?.color || "",
    updatedAt: slot.updated_at,
    updated_at: slot.updated_at
  };
}

async function getSlots(path = "") {
  const supabase = await getSupabaseClient();

  const zoneId =
    getQueryParam(path, "zoneKey") ||
    getQueryParam(path, "zone_key") ||
    getQueryParam(path, "zoneId");

  let query = supabase
    .from("parking_slots")
    .select("*, parking_zones(name, vehicle_type), vehicles(plate, vehicle_type, brand, color), app_users(full_name, student_code, username, phone)")
    .order("slot_code", { ascending: true });

  if (zoneId) {
    query = query.eq("zone_id", zoneId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return {
    success: true,
    slots: (data || []).map(normalizeSlot)
  };
}

async function getAdminDashboard() {
  const stats = await getStats();
  const zones = await getZonesWithCounts();
  const slotsResult = await getSlots("/api/slots");

  const usedSlots = (slotsResult.slots || []).filter((slot) => slot.status !== "empty");

  return {
    success: true,
    stats: stats,
    zones: zones,
    recent: usedSlots,
    activeVehicles: usedSlots,
    alerts: usedSlots.filter((slot) => slot.status === "warning")
  };
}

async function getAdminActiveVehicles() {
  const dashboard = await getAdminDashboard();

  return {
    success: true,
    vehicles: dashboard.activeVehicles || []
  };
}

async function getStudentVehicles() {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const vehicles = (data || []).map((v) => ({
    id: v.id,
    plate: v.plate,
    vehicle_type: v.vehicle_type,
    vehicleType: v.vehicle_type,
    brand: v.brand || "",
    color: v.color || "",
    status: v.status,
    isParking: v.status === "parking",
    is_default: v.is_default ? 1 : 0,
    isDefault: !!v.is_default,
    zone_id: v.zone_id,
    zoneId: v.zone_id,
    slot_code: v.slot_code,
    slotCode: v.slot_code,
    created_at: v.created_at,
    updated_at: v.updated_at
  }));

  return {
    success: true,
    vehicles: vehicles,
    activeParking: vehicles.filter((v) => v.status === "parking")
  };
}

async function addStudentVehicle(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();

  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();

  if (!plate) {
    throw new Error("Vui lòng nhập biển số xe.");
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      user_id: user.id,
      plate: plate,
      vehicle_type: body.vehicle_type || body.vehicleType || "Xe máy",
      brand: body.brand || body.model || "",
      color: body.color || "",
      status: "outside",
      is_default: false
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: "Khai báo xe thành công.",
    vehicle: data
  };
}

async function deleteStudentVehicle(path) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const parts = normalizePath(path).split("/").filter(Boolean);
  const vehicleId = parts[parts.length - 1];

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", vehicleId)
    .eq("user_id", user.id)
    .single();

  if (vehicle && vehicle.status === "parking") {
    throw new Error("Xe đang gửi trong bãi, không thể xóa.");
  }

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: "Xóa xe thành công."
  };
}

async function getStudentHistoryOnly(userId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*, vehicles(plate, vehicle_type), parking_sessions(zone_id, plate, parking_zones(name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((tx) => ({
    id: tx.id,
    action: tx.type,
    type: tx.type,
    actionText:
      tx.type === "TOPUP"
        ? "Nạp tiền"
        : tx.type === "CHECKIN"
        ? "Gửi xe / Trừ phí"
        : tx.type === "CHECKOUT"
        ? "Lấy xe"
        : tx.type,
    amount: Number(tx.amount || 0),
    balance_after: Number(tx.balance_after || 0),
    balanceAfter: Number(tx.balance_after || 0),
    plate: tx.vehicles?.plate || tx.parking_sessions?.plate || "",
    zone_name: tx.parking_sessions?.parking_zones?.name || tx.parking_sessions?.zone_id || "",
    zoneName: tx.parking_sessions?.parking_zones?.name || tx.parking_sessions?.zone_id || "",
    description: tx.description || "",
    created_at: tx.created_at,
    createdAt: tx.created_at
  }));
}

async function getStudentWallet() {
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);
  const history = await getStudentHistoryOnly(user.id);

  saveLoginSession(normalizeUser(user, wallet));

  return {
    success: true,
    balance: Number(wallet.balance || 0),
    wallet: {
      balance: Number(wallet.balance || 0),
      history: history
    },
    history: history,
    transactions: history
  };
}

async function topupWallet(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);

  const amount = Number(body.amount || 0);

  if (amount < 10000) {
    throw new Error("Số tiền nạp tối thiểu là 10.000đ.");
  }

  const before = Number(wallet.balance || 0);
  const after = before + amount;

  const { error: walletError } = await supabase
    .from("wallets")
    .update({
      balance: after,
      updated_at: new Date().toISOString()
    })
    .eq("id", wallet.id);

  if (walletError) throw new Error(walletError.message);

  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      type: "TOPUP",
      amount: amount,
      balance_after: after,
      description: body.method || body.description || "Nạp tiền vào ví"
    });

  if (txError) throw new Error(txError.message);

  saveLoginSession(normalizeUser(user, { balance: after }));

  return {
    success: true,
    message: "Nạp tiền thành công.",
    balance: after,
    wallet: {
      balance: after
    }
  };
}

async function studentCheckin(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);

  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();
  const zoneId = body.zoneKey || body.zone_id || body.zoneId || "student1";

  if (!plate) {
    throw new Error("Vui lòng chọn xe để gửi.");
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .eq("plate", plate)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error("Xe này chưa được khai báo trong mục Xe của tôi.");
  }

  if (vehicle.status === "parking") {
    throw new Error("Xe này đang được gửi trong bãi.");
  }

  const fee = vehicle.vehicle_type === "Ô tô" ? 5000 : 3000;
  const before = Number(wallet.balance || 0);

  if (before < fee) {
    throw new Error("Số dư không đủ, vui lòng nạp thêm tiền.");
  }

  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("status", "empty")
    .order("slot_code", { ascending: true })
    .limit(1)
    .single();

  if (slotError || !slot) {
    throw new Error("Khu này hiện không còn chỗ trống.");
  }

  const after = before - fee;

  const { error: walletError } = await supabase
    .from("wallets")
    .update({
      balance: after,
      updated_at: new Date().toISOString()
    })
    .eq("id", wallet.id);

  if (walletError) throw new Error(walletError.message);

  const { error: slotUpdateError } = await supabase
    .from("parking_slots")
    .update({
      status: vehicle.vehicle_type === "Ô tô" ? "car" : "used",
      user_id: user.id,
      vehicle_id: vehicle.id,
      plate: plate,
      updated_at: new Date().toISOString()
    })
    .eq("id", slot.id);

  if (slotUpdateError) throw new Error(slotUpdateError.message);

  const { error: vehicleUpdateError } = await supabase
    .from("vehicles")
    .update({
      status: "parking",
      zone_id: zoneId,
      slot_code: slot.slot_code,
      updated_at: new Date().toISOString()
    })
    .eq("id", vehicle.id);

  if (vehicleUpdateError) throw new Error(vehicleUpdateError.message);

  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      zone_id: zoneId,
      slot_id: slot.id,
      plate: plate,
      fee: fee,
      status: "active"
    })
    .select()
    .single();

  if (sessionError) throw new Error(sessionError.message);

  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      session_id: session.id,
      type: "CHECKIN",
      amount: -fee,
      balance_after: after,
      description: "Gửi xe tại " + zoneId + " - ô " + slot.slot_code
    });

  if (txError) throw new Error(txError.message);

  saveLoginSession(normalizeUser(user, { balance: after }));

  return {
    success: true,
    message: "Gửi xe thành công. Phí gửi xe: " + moneyVND(fee),
    slot: {
      id: slot.id,
      slotCode: slot.slot_code,
      slot_code: slot.slot_code,
      zoneKey: zoneId,
      zone_key: zoneId
    },
    balance: after,
    balanceAfter: after
  };
}

async function studentCheckout(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);

  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();

  if (!plate) {
    throw new Error("Vui lòng chọn xe cần lấy.");
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .eq("plate", plate)
    .single();

  if (vehicleError || !vehicle) {
    throw new Error("Không tìm thấy xe.");
  }

  if (vehicle.status !== "parking") {
    throw new Error("Xe này hiện không có trong bãi.");
  }

  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("vehicle_id", vehicle.id)
    .eq("status", "active")
    .single();

  if (sessionError || !session) {
    throw new Error("Không tìm thấy lượt gửi xe đang hoạt động.");
  }

  await supabase
    .from("parking_slots")
    .update({
      status: "empty",
      user_id: null,
      vehicle_id: null,
      plate: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", session.slot_id);

  await supabase
    .from("vehicles")
    .update({
      status: "outside",
      zone_id: null,
      slot_code: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", vehicle.id);

  await supabase
    .from("parking_sessions")
    .update({
      status: "closed",
      checkout_at: new Date().toISOString()
    })
    .eq("id", session.id);

  await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      session_id: session.id,
      type: "CHECKOUT",
      amount: 0,
      balance_after: wallet.balance,
      description: "Lấy xe khỏi bãi"
    });

  return {
    success: true,
    message: "Lấy xe thành công.",
    balance: wallet.balance
  };
}

async function apiGet(path) {
  path = normalizePath(path);

  try {
    if (path.includes("/admin/dashboard")) return await getAdminDashboard();
    if (path.includes("/admin/active-vehicles")) return await getAdminActiveVehicles();
    if (path.includes("/stats")) return await getStats();

    if (path.includes("/parking-lots") || path.includes("/student/parking/zones")) {
      const zones = await getZonesWithCounts();
      return path.includes("/student/parking/zones")
        ? { success: true, zones: zones }
        : zones;
    }

    if (path.includes("/slots")) return await getSlots(path);
    if (path.includes("/student/vehicles")) return await getStudentVehicles();
    if (path.includes("/student/wallet")) return await getStudentWallet();

    if (path.includes("/student/history") || path.includes("/history") || path.includes("/transactions")) {
      const user = await getCurrentDbUser();
      const history = await getStudentHistoryOnly(user.id);
      return {
        success: true,
        history: history,
        transactions: history
      };
    }

    return {
      success: true,
      message: "Supabase API đã sẵn sàng."
    };
  } catch (error) {
    console.error("apiGet error:", error);
    return {
      success: false,
      message: error.message || "Không lấy được dữ liệu."
    };
  }
}

async function apiPost(path, body = {}) {
  path = normalizePath(path);

  try {
    if (path.includes("/login")) {
      await loginUser(body.username || body.email || "", body.password || "", body.role || "");
      return {
        success: true
      };
    }

    if (path.includes("/student/vehicles")) return await addStudentVehicle(body);
    if (path.includes("/student/wallet/topup") || path.includes("/wallet/topup")) return await topupWallet(body);
    if (path.includes("/student/parking/checkin") || path.includes("/vehicle/in")) return await studentCheckin(body);
    if (path.includes("/student/parking/checkout") || path.includes("/vehicle/out")) return await studentCheckout(body);

    return {
      success: true,
      message: "Supabase đã nhận yêu cầu."
    };
  } catch (error) {
    console.error("apiPost error:", error);
    return {
      success: false,
      message: error.message || "Không xử lý được yêu cầu."
    };
  }
}

async function apiDelete(path) {
  path = normalizePath(path);

  try {
    if (path.includes("/student/vehicles/")) {
      return await deleteStudentVehicle(path);
    }

    return {
      success: true,
      message: "Đã xử lý."
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

function goToPage(page) {
  window.location.href = page;
}

window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiDelete = apiDelete;

window.smartUttApiGet = apiGet;
window.smartUttApiPost = apiPost;
window.smartUttApiDelete = apiDelete;
window.apiGetFromSupabaseReady = true;

window.loginUser = loginUser;
window.getCurrentUser = getCurrentUser;
window.saveLoginSession = saveLoginSession;
window.requireAuth = requireAuth;
window.guardAdmin = guardAdmin;
window.logout = logout;
window.goToPage = goToPage;

window.money = money;
window.moneyVND = moneyVND;
window.formatDateTime = formatDateTime;

console.log("✅ api.js Supabase ổn định đã sẵn sàng");

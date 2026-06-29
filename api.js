

const SUPABASE_URL = "https://znqtskbjbvayrqipamqa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0MyC0DLeoH12tQ4g5mWulg_w3CqSOyJ";
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

let smartUttSupabaseClient = null;

function moneyVND(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function normalizePath(path) {
  if (!path) return "/";
  const raw = String(path);
  try {
    const url = new URL(raw, location.origin);
    return url.pathname + url.search;
  } catch (error) {
    return raw;
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

function toCamelUser(user, wallet) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name,
    fullName: user.full_name,
    student_code: user.student_code,
    studentCode: user.student_code || user.username,
    phone: user.phone || "",
    department: user.department || "",
    balance: wallet ? Number(wallet.balance || 0) : Number(user.balance || 0)
  };
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(text));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    script.onerror = () => reject(new Error("Không tải được thư viện Supabase."));
    document.head.appendChild(script);
  });
}

async function getSupabaseClient() {
  if (smartUttSupabaseClient) return smartUttSupabaseClient;

  if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_SUPABASE_URL_HERE")) {
    throw new Error("Bạn chưa điền SUPABASE_URL trong api.js.");
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_SUPABASE_ANON_KEY_HERE")) {
    throw new Error("Bạn chưa điền SUPABASE_ANON_KEY trong api.js.");
  }

  await loadSupabaseScript();
  smartUttSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return smartUttSupabaseClient;
}

function saveLoginSession(user) {
  const normalized = {
    id: user.id,
    username: user.username,
    role: user.role,
    full_name: user.full_name || user.fullName,
    fullName: user.full_name || user.fullName,
    student_code: user.student_code || user.studentCode,
    studentCode: user.student_code || user.studentCode || user.username,
    phone: user.phone || "",
    department: user.department || "",
    balance: Number(user.balance || 0)
  };

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
      if (user && user.role) return user;
    } catch (error) {}
  }

  return null;
}

function logout() {
  localStorage.removeItem("smart_utt_current_user");
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
    if (user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "student-home.html";
    }
    return null;
  }

  return user;
}

async function getCurrentDbUser() {
  const sessionUser = getCurrentUser();
  if (!sessionUser) throw new Error("Bạn chưa đăng nhập.");

  const supabase = await getSupabaseClient();
  const { data: user, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", sessionUser.id)
    .single();

  if (error || !user) throw new Error("Không tìm thấy tài khoản đang đăng nhập.");
  return user;
}

async function getWalletByUserId(userId) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error("Không lấy được ví người dùng: " + error.message);
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

  const normalized = saveLoginSession(toCamelUser(user, wallet));

  if (normalized.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    window.location.href = "student-home.html";
  }
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

  return zones.map((zone) => {
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
      totalSlots: zoneSlots.length || zone.total_slots,
      total_slots: zoneSlots.length || zone.total_slots,
      usedSlots: usedSlots,
      used_slots: usedSlots,
      occupiedSlots: usedSlots,
      emptySlots: emptySlots,
      empty_slots: emptySlots,
      availableSlots: emptySlots
    };
  });
}

async function getAdminDashboard() {
  const supabase = await getSupabaseClient();
  const zones = await getZonesWithCounts();

  const { data: slots, error: slotError } = await supabase
    .from("parking_slots")
    .select("*, parking_zones(name, vehicle_type), vehicles(plate, vehicle_type, brand, color), app_users(full_name, student_code, phone)")
    .order("slot_code", { ascending: true });

  if (slotError) throw new Error(slotError.message);

  const usedSlots = slots.filter((slot) => slot.status !== "empty");

  const { data: txs, error: txError } = await supabase
    .from("wallet_transactions")
    .select("amount, type, created_at")
    .eq("type", "CHECKIN");

  if (txError) throw new Error(txError.message);

  const today = new Date().toLocaleDateString("vi-VN");
  const todayRevenue = (txs || [])
    .filter((tx) => new Date(tx.created_at).toLocaleDateString("vi-VN") === today)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

  const totalSlots = slots.length;
  const usedCount = usedSlots.length;
  const emptySlots = totalSlots - usedCount;

  const recent = usedSlots.map((slot) => ({
    id: slot.id,
    slotCode: slot.slot_code,
    slot_code: slot.slot_code,
    zoneKey: slot.zone_id,
    zone_key: slot.zone_id,
    zoneName: slot.parking_zones?.name || slot.zone_id,
    zone_name: slot.parking_zones?.name || slot.zone_id,
    status: slot.status,
    plate: slot.plate || slot.vehicles?.plate || "",
    vehicleType: slot.vehicles?.vehicle_type || slot.parking_zones?.vehicle_type || "",
    vehicle_type: slot.vehicles?.vehicle_type || slot.parking_zones?.vehicle_type || "",
    brand: slot.vehicles?.brand || "",
    color: slot.vehicles?.color || "",
    studentName: slot.app_users?.full_name || "",
    student_name: slot.app_users?.full_name || "",
    studentCode: slot.app_users?.student_code || "",
    student_code: slot.app_users?.student_code || "",
    phone: slot.app_users?.phone || "",
    updatedAt: slot.updated_at
  }));

  return {
    success: true,
    stats: {
      totalSlots: totalSlots,
      emptySlots: emptySlots,
      availableSlots: emptySlots,
      usedSlots: usedCount,
      occupiedSlots: usedCount,
      todayRevenue: todayRevenue,
      warningSlots: slots.filter((slot) => slot.status === "warning").length
    },
    zones: zones,
    recent: recent,
    activeVehicles: recent,
    alerts: []
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

  return {
    success: true,
    vehicles: (data || []).map((v) => ({
      id: v.id,
      plate: v.plate,
      vehicle_type: v.vehicle_type,
      vehicleType: v.vehicle_type,
      brand: v.brand || "",
      color: v.color || "",
      status: v.status,
      zone_id: v.zone_id,
      zoneId: v.zone_id,
      slot_code: v.slot_code,
      slotCode: v.slot_code,
      created_at: v.created_at
    }))
  };
}

async function addStudentVehicle(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();

  if (!plate) throw new Error("Vui lòng nhập biển số xe.");

  const payload = {
    user_id: user.id,
    plate: plate,
    vehicle_type: body.vehicle_type || body.vehicleType || "Xe máy",
    brand: body.brand || body.model || "",
    color: body.color || "",
    status: "outside"
  };

  const { data, error } = await supabase
    .from("vehicles")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    success: true,
    message: "Thêm xe thành công.",
    vehicle: data
  };
}

async function getStudentWallet(path) {
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);
  const history = await getStudentHistoryOnly(user.id);

  const normalized = saveLoginSession(toCamelUser(user, wallet));

  return {
    success: true,
    balance: wallet.balance,
    user: normalized,
    wallet: {
      balance: wallet.balance,
      history: history
    },
    history: history,
    transactions: history
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
    actionText: tx.type === "TOPUP" ? "Nạp tiền" : tx.type === "CHECKIN" ? "Gửi xe" : tx.type === "CHECKOUT" ? "Lấy xe" : "Điều chỉnh",
    amount: tx.amount,
    fee: tx.type === "CHECKIN" ? Math.abs(tx.amount) : 0,
    balance_after: tx.balance_after,
    balanceAfter: tx.balance_after,
    plate: tx.vehicles?.plate || tx.parking_sessions?.plate || "",
    zone_name: tx.parking_sessions?.parking_zones?.name || tx.parking_sessions?.zone_id || "",
    zoneName: tx.parking_sessions?.parking_zones?.name || tx.parking_sessions?.zone_id || "",
    description: tx.description || "",
    created_at: tx.created_at,
    createdAt: tx.created_at
  }));
}

async function topupWallet(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);
  const amount = Number(body.amount || 0);

  if (amount <= 0) throw new Error("Số tiền nạp không hợp lệ.");
  if (amount < 10000) throw new Error("Số tiền nạp tối thiểu là 10.000đ.");

  const newBalance = Number(wallet.balance || 0) + amount;

  const { error: updateError } = await supabase
    .from("wallets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", wallet.id);

  if (updateError) throw new Error(updateError.message);

  const { error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      user_id: user.id,
      type: "TOPUP",
      amount: amount,
      balance_after: newBalance,
      description: body.method || body.description || "Nạp tiền vào ví"
    });

  if (txError) throw new Error(txError.message);

  saveLoginSession(toCamelUser(user, { balance: newBalance }));

  return {
    success: true,
    message: "Nạp tiền thành công.",
    balance: newBalance,
    wallet: {
      balance: newBalance
    }
  };
}

async function studentCheckin(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const wallet = await getWalletByUserId(user.id);

  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();
  const zoneId = body.zoneKey || body.zone_id || body.zoneId || "student1";

  if (!plate) throw new Error("Vui lòng chọn xe để gửi.");

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .eq("plate", plate)
    .single();

  if (vehicleError || !vehicle) throw new Error("Xe này chưa được khai báo trong mục Xe của tôi.");
  if (vehicle.status === "parking") throw new Error("Xe này đang được gửi trong bãi.");

  const fee = vehicle.vehicle_type === "Ô tô" ? 5000 : 3000;
  if (Number(wallet.balance || 0) < fee) throw new Error("Số dư không đủ, vui lòng nạp thêm tiền.");

  const { data: slot, error: slotError } = await supabase
    .from("parking_slots")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("status", "empty")
    .order("slot_code", { ascending: true })
    .limit(1)
    .single();

  if (slotError || !slot) throw new Error("Khu này hiện không còn chỗ trống.");

  const newBalance = Number(wallet.balance || 0) - fee;

  const { error: walletError } = await supabase
    .from("wallets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
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
      balance_after: newBalance,
      description: "Gửi xe tại " + zoneId + " - ô " + slot.slot_code
    });

  if (txError) throw new Error(txError.message);

  saveLoginSession(toCamelUser(user, { balance: newBalance }));

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
    balance: newBalance
  };
}

async function studentCheckout(body) {
  const supabase = await getSupabaseClient();
  const user = await getCurrentDbUser();
  const plate = String(body.plate || body.licensePlate || "").trim().toUpperCase();

  if (!plate) throw new Error("Vui lòng chọn xe cần lấy.");

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*")
    .eq("user_id", user.id)
    .eq("plate", plate)
    .single();

  if (vehicleError || !vehicle) throw new Error("Không tìm thấy xe.");
  if (vehicle.status !== "parking") throw new Error("Xe này hiện không có trong bãi.");

  const { data: session, error: sessionError } = await supabase
    .from("parking_sessions")
    .select("*")
    .eq("vehicle_id", vehicle.id)
    .eq("status", "active")
    .single();

  if (sessionError || !session) throw new Error("Không tìm thấy lượt gửi xe đang hoạt động.");

  const wallet = await getWalletByUserId(user.id);

  const { error: slotError } = await supabase
    .from("parking_slots")
    .update({
      status: "empty",
      user_id: null,
      vehicle_id: null,
      plate: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", session.slot_id);

  if (slotError) throw new Error(slotError.message);

  const { error: vehicleUpdateError } = await supabase
    .from("vehicles")
    .update({
      status: "outside",
      zone_id: null,
      slot_code: null,
      updated_at: new Date().toISOString()
    })
    .eq("id", vehicle.id);

  if (vehicleUpdateError) throw new Error(vehicleUpdateError.message);

  const { error: sessionUpdateError } = await supabase
    .from("parking_sessions")
    .update({
      status: "closed",
      checkout_at: new Date().toISOString()
    })
    .eq("id", session.id);

  if (sessionUpdateError) throw new Error(sessionUpdateError.message);

  await supabase.from("wallet_transactions").insert({
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
    message: "Lấy xe thành công."
  };
}

async function getSlots(path) {
  const supabase = await getSupabaseClient();
  const zoneId = getQueryParam(path, "zoneKey") || getQueryParam(path, "zone_key") || getQueryParam(path, "zoneId");

  let query = supabase
    .from("parking_slots")
    .select("*, parking_zones(name, vehicle_type), vehicles(plate, vehicle_type, brand, color), app_users(full_name, student_code, phone)")
    .order("slot_code", { ascending: true });

  if (zoneId) query = query.eq("zone_id", zoneId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return {
    success: true,
    slots: (data || []).map((slot) => ({
      id: slot.id,
      slotCode: slot.slot_code,
      slot_code: slot.slot_code,
      zoneKey: slot.zone_id,
      zone_key: slot.zone_id,
      zoneName: slot.parking_zones?.name || slot.zone_id,
      zone_name: slot.parking_zones?.name || slot.zone_id,
      status: slot.status,
      plate: slot.plate || "",
      studentName: slot.app_users?.full_name || "",
      student_name: slot.app_users?.full_name || "",
      studentCode: slot.app_users?.student_code || "",
      student_code: slot.app_users?.student_code || "",
      phone: slot.app_users?.phone || "",
      vehicleType: slot.vehicles?.vehicle_type || slot.parking_zones?.vehicle_type || "",
      vehicle_type: slot.vehicles?.vehicle_type || slot.parking_zones?.vehicle_type || "",
      color: slot.vehicles?.color || "",
      brand: slot.vehicles?.brand || "",
      updatedAt: slot.updated_at
    }))
  };
}

async function apiGet(path) {
  path = normalizePath(path);

  try {
    if (path.includes("/admin/dashboard")) return await getAdminDashboard();

    if (path.includes("/stats")) {
      const dashboard = await getAdminDashboard();
      return { success: true, ...dashboard.stats };
    }

    if (path.includes("/parking-lots") || path.includes("/student/parking/zones")) {
      const zones = await getZonesWithCounts();
      return path.includes("/student/parking/zones") ? { success: true, zones } : zones;
    }

    if (path.includes("/slots")) return await getSlots(path);
    if (path.includes("/student/vehicles")) return await getStudentVehicles();
    if (path.includes("/student/wallet")) return await getStudentWallet(path);

    if (path.includes("/student/history") || path.includes("/history") || path.includes("/transactions")) {
      const user = await getCurrentDbUser();
      const history = await getStudentHistoryOnly(user.id);
      return { success: true, history, transactions: history };
    }

    return { success: true, message: "Supabase API đã sẵn sàng." };
  } catch (error) {
    console.error("apiGet error:", error);
    return { success: false, message: error.message || "Không lấy được dữ liệu." };
  }
}

async function apiPost(path, body = {}) {
  path = normalizePath(path);

  try {
    if (path.includes("/login")) {
      const username = body.username || body.email || "";
      const password = body.password || "";
      const role = body.role || "";
      await loginUser(username, password, role);
      return { success: true };
    }

    if (path.includes("/student/vehicles")) return await addStudentVehicle(body);
    if (path.includes("/student/wallet/topup") || path.includes("/wallet/topup")) return await topupWallet(body);
    if (path.includes("/student/parking/checkin") || path.includes("/vehicle/in")) return await studentCheckin(body);
    if (path.includes("/student/parking/checkout") || path.includes("/vehicle/out")) return await studentCheckout(body);

    return { success: true, message: "Supabase đã nhận yêu cầu." };
  } catch (error) {
    console.error("apiPost error:", error);
    return { success: false, message: error.message || "Không xử lý được yêu cầu." };
  }
}

async function apiDelete(path) {
  path = normalizePath(path);
  const supabase = await getSupabaseClient();

  try {
    if (path.includes("/student/vehicles/")) {
      const id = path.split("/").pop();
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { success: true, message: "Xóa xe thành công." };
    }

    return { success: true, message: "Đã xử lý." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiDelete = apiDelete;
window.loginUser = loginUser;
window.getCurrentUser = getCurrentUser;
window.saveLoginSession = saveLoginSession;
window.requireAuth = requireAuth;
window.logout = logout;
window.smartUttApiGet = apiGet;
window.smartUttApiPost = apiPost;
window.smartUttApiDelete = apiDelete;


window.smartUttApiGet = window.apiGet || apiGet;
window.smartUttApiPost = window.apiPost || apiPost;
window.smartUttApiDelete = window.apiDelete || apiDelete;

window.apiGetFromSupabaseReady = true;

console.log("✅ Smart UTT Supabase API đã sẵn sàng");

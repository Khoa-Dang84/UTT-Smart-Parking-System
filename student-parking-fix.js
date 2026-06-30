/* ============================================================
   Smart UTT Parking - Fix gửi xe / lấy xe cho sinh viên
   File này gắn lại toàn bộ thao tác gửi xe, lấy xe, tải dữ liệu
============================================================ */

(function () {
  function getCurrentStudent() {
    const keys = ["smart_utt_current_user", "currentUser", "utt_current_user"];

    for (const key of keys) {
      const raw = localStorage.getItem(key);

      if (!raw) continue;

      try {
        const user = JSON.parse(raw);
        if (user && user.role === "student") return user;
      } catch (error) {}
    }

    return null;
  }

  function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + "đ";
  }

  function formatDateTime(value) {
    if (!value) return "---";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("vi-VN");
  }

  function statusText(status) {
    if (status === "parking") return "Đang gửi";
    if (status === "outside") return "Chưa gửi";
    if (status === "empty") return "Còn trống";
    if (status === "used") return "Đang có xe";
    if (status === "car") return "Đang có ô tô";
    return status || "---";
  }

  function showMessage(text, ok = true) {
    const box = document.getElementById("parkingFixMessage");

    if (!box) return;

    box.textContent = text || "";
    box.className = ok ? "parking-fix-message success" : "parking-fix-message error";
  }

  function hideOldBackendErrors() {
    const all = Array.from(document.querySelectorAll("body *"));

    all.forEach((element) => {
      const text = element.textContent || "";

      if (
        text.includes("Backend trả về HTML") ||
        text.includes("/api/student/parking") ||
        text.includes("/api/student/wallet")
      ) {
        element.style.display = "none";
      }
    });
  }

  function ensureApi() {
    return new Promise((resolve, reject) => {
      if (window.smartUttApiGet && window.smartUttApiPost) {
        resolve();
        return;
      }

      if (window.apiGet && window.apiPost) {
        resolve();
        return;
      }

      const existed = document.querySelector("script[data-parking-fix-api]");

      if (existed) {
        existed.addEventListener("load", resolve);
        existed.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = "api.js?v=" + Date.now();
      script.setAttribute("data-parking-fix-api", "true");

      script.onload = function () {
        resolve();
      };

      script.onerror = function () {
        reject(new Error("Không tải được api.js."));
      };

      document.head.appendChild(script);
    });
  }

  async function callGet(path) {
    await ensureApi();

    if (window.smartUttApiGet) return await window.smartUttApiGet(path);
    if (window.apiGet) return await window.apiGet(path);

    throw new Error("Không tìm thấy hàm apiGet.");
  }

  async function callPost(path, body) {
    await ensureApi();

    if (window.smartUttApiPost) return await window.smartUttApiPost(path, body);
    if (window.apiPost) return await window.apiPost(path, body);

    throw new Error("Không tìm thấy hàm apiPost.");
  }

  function createPanel() {
    if (document.getElementById("smartParkingFixPanel")) return;

    const css = document.createElement("style");
    css.textContent = `
      .parking-fix-panel {
        background: #ffffff;
        border-radius: 22px;
        padding: 28px;
        margin: 24px 0;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(37, 99, 235, 0.12);
      }

      .parking-fix-title {
        font-size: 28px;
        font-weight: 900;
        color: #1e3a8a;
        margin-bottom: 8px;
      }

      .parking-fix-subtitle {
        color: #64748b;
        font-weight: 600;
        margin-bottom: 20px;
      }

      .parking-fix-stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(160px, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }

      .parking-fix-stat {
        background: #f8fafc;
        border: 1px solid #dbeafe;
        border-radius: 18px;
        padding: 18px;
      }

      .parking-fix-stat span {
        display: block;
        color: #64748b;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .parking-fix-stat strong {
        font-size: 28px;
        color: #1e3a8a;
      }

      .parking-fix-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 18px;
      }

      .parking-fix-form label {
        display: block;
        color: #1e3a8a;
        font-weight: 900;
        margin-bottom: 8px;
      }

      .parking-fix-form select {
        width: 100%;
        height: 54px;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 0 16px;
        font-size: 16px;
        font-weight: 700;
        background: white;
        color: #0f172a;
      }

      .parking-fix-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 18px;
      }

      .parking-fix-actions button {
        border: none;
        border-radius: 14px;
        padding: 14px 22px;
        font-weight: 900;
        color: white;
        cursor: pointer;
        font-size: 16px;
      }

      .parking-fix-actions .checkin {
        background: #16a34a;
      }

      .parking-fix-actions .checkout {
        background: #f97316;
      }

      .parking-fix-actions .reload {
        background: #0f172a;
      }

      .parking-fix-actions .vehicles {
        background: #2563eb;
      }

      .parking-fix-message {
        padding: 14px 16px;
        border-radius: 14px;
        font-weight: 900;
        margin-bottom: 18px;
        display: none;
      }

      .parking-fix-message.success {
        display: block;
        background: #dcfce7;
        color: #166534;
      }

      .parking-fix-message.error {
        display: block;
        background: #fee2e2;
        color: #991b1b;
      }

      .parking-fix-table-wrap {
        overflow-x: auto;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
      }

      .parking-fix-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      .parking-fix-table th {
        background: #eff6ff;
        color: #1e3a8a;
        padding: 14px;
        text-align: left;
        font-weight: 900;
      }

      .parking-fix-table td {
        padding: 14px;
        border-top: 1px solid #e2e8f0;
        color: #334155;
        font-weight: 700;
      }

      .parking-fix-badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: #dbeafe;
        color: #1e40af;
        font-weight: 900;
      }

      @media (max-width: 900px) {
        .parking-fix-stats {
          grid-template-columns: 1fr 1fr;
        }

        .parking-fix-form {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(css);

    const panel = document.createElement("section");
    panel.id = "smartParkingFixPanel";
    panel.className = "parking-fix-panel";

    panel.innerHTML = `
      <div class="parking-fix-title">Gửi xe / Lấy xe</div>
      <div class="parking-fix-subtitle">
        Chọn xe đã khai báo, chọn khu gửi xe và xác nhận. Dữ liệu sẽ được lưu vào Supabase và đồng bộ sang Admin.
      </div>

      <div class="parking-fix-stats">
        <div class="parking-fix-stat">
          <span>Số dư ví</span>
          <strong id="fixBalance">0đ</strong>
        </div>
        <div class="parking-fix-stat">
          <span>Tổng ô</span>
          <strong id="fixTotalSlots">0</strong>
        </div>
        <div class="parking-fix-stat">
          <span>Còn trống</span>
          <strong id="fixEmptySlots">0</strong>
        </div>
        <div class="parking-fix-stat">
          <span>Đang có xe</span>
          <strong id="fixUsedSlots">0</strong>
        </div>
      </div>

      <div class="parking-fix-form">
        <div>
          <label for="fixVehicleSelect">Chọn xe</label>
          <select id="fixVehicleSelect">
            <option value="">Đang tải xe...</option>
          </select>
        </div>

        <div>
          <label for="fixZoneSelect">Chọn khu gửi xe</label>
          <select id="fixZoneSelect">
            <option value="">Đang tải khu...</option>
          </select>
        </div>
      </div>

      <div class="parking-fix-actions">
        <button class="checkin" id="fixCheckinBtn" type="button">Gửi xe và trừ tiền</button>
        <button class="checkout" id="fixCheckoutBtn" type="button">Lấy xe</button>
        <button class="reload" id="fixReloadBtn" type="button">Tải lại dữ liệu</button>
        <button class="vehicles" id="fixGoVehiclesBtn" type="button">Khai báo xe</button>
      </div>

      <div id="parkingFixMessage" class="parking-fix-message"></div>

      <h3 style="color:#1e3a8a;font-size:22px;margin:20px 0 12px;font-weight:900;">
        Xe của bạn đang gửi trong bãi
      </h3>

      <div class="parking-fix-table-wrap">
        <table class="parking-fix-table">
          <thead>
            <tr>
              <th>Biển số</th>
              <th>Mã ô</th>
              <th>Khu vực</th>
              <th>Loại xe</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody id="fixActiveVehicles">
            <tr>
              <td colspan="6">Đang tải dữ liệu...</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const main = document.querySelector("main") || document.querySelector(".main-content") || document.body;
    const firstBigCard = main.querySelector("section") || main.firstElementChild;

    if (firstBigCard && firstBigCard.parentNode) {
      firstBigCard.parentNode.insertBefore(panel, firstBigCard.nextSibling);
    } else {
      main.appendChild(panel);
    }
  }

  function fillSelects(vehicles, zones) {
    const vehicleSelect = document.getElementById("fixVehicleSelect");
    const zoneSelect = document.getElementById("fixZoneSelect");

    if (!vehicleSelect || !zoneSelect) return;

    const outsideVehicles = vehicles.filter((vehicle) => vehicle.status !== "parking");

    if (vehicles.length === 0) {
      vehicleSelect.innerHTML = `<option value="">Bạn chưa khai báo xe</option>`;
    } else if (outsideVehicles.length === 0) {
      vehicleSelect.innerHTML = `<option value="">Tất cả xe đang gửi trong bãi</option>`;
    } else {
      vehicleSelect.innerHTML = outsideVehicles
        .map((vehicle) => {
          return `<option value="${vehicle.plate}">
            ${vehicle.plate} - ${vehicle.vehicleType || vehicle.vehicle_type || "Xe"}
          </option>`;
        })
        .join("");
    }

    const availableZones = zones.filter((zone) => Number(zone.emptySlots || zone.empty_slots || zone.availableSlots || 0) > 0);

    if (availableZones.length === 0) {
      zoneSelect.innerHTML = `<option value="">Không còn khu trống</option>`;
    } else {
      zoneSelect.innerHTML = availableZones
        .map((zone) => {
          const id = zone.zoneKey || zone.zone_key || zone.id;
          const name = zone.zoneName || zone.zone_name || zone.name;
          const empty = zone.emptySlots || zone.empty_slots || zone.availableSlots || 0;
          return `<option value="${id}">${name} - còn ${empty} ô</option>`;
        })
        .join("");
    }
  }

  function fillActiveVehicles(vehicles) {
    const body = document.getElementById("fixActiveVehicles");

    if (!body) return;

    const active = vehicles.filter((vehicle) => vehicle.status === "parking");

    if (active.length === 0) {
      body.innerHTML = `<tr><td colspan="6">Bạn chưa có xe nào đang gửi trong bãi.</td></tr>`;
      return;
    }

    body.innerHTML = active
      .map((vehicle) => {
        return `
          <tr>
            <td>${vehicle.plate || "---"}</td>
            <td>${vehicle.slotCode || vehicle.slot_code || "---"}</td>
            <td>${vehicle.zoneName || vehicle.zone_name || vehicle.zone_id || "---"}</td>
            <td>${vehicle.vehicleType || vehicle.vehicle_type || "---"}</td>
            <td><span class="parking-fix-badge">${statusText(vehicle.status)}</span></td>
            <td>${formatDateTime(vehicle.updated_at || vehicle.updatedAt)}</td>
          </tr>
        `;
      })
      .join("");
  }

  async function loadParkingData() {
    try {
      hideOldBackendErrors();

      const user = getCurrentStudent();

      if (!user) {
        showMessage("Bạn cần đăng nhập sinh viên trước.", false);
        return;
      }

      const walletResult = await callGet("/api/student/wallet?student_code=" + encodeURIComponent(user.studentCode || user.student_code || user.username));
      const vehicleResult = await callGet("/api/student/vehicles");
      const zoneResult = await callGet("/api/student/parking/zones");
      const statsResult = await callGet("/api/stats");

      const balance = walletResult.balance || walletResult.wallet?.balance || 0;
      const vehicles = vehicleResult.vehicles || [];
      const zones = zoneResult.zones || zoneResult || [];

      document.getElementById("fixBalance").textContent = money(balance);
      document.getElementById("fixTotalSlots").textContent = statsResult.totalSlots || statsResult.stats?.totalSlots || 0;
      document.getElementById("fixEmptySlots").textContent = statsResult.emptySlots || statsResult.availableSlots || statsResult.stats?.emptySlots || 0;
      document.getElementById("fixUsedSlots").textContent = statsResult.usedSlots || statsResult.occupiedSlots || statsResult.stats?.usedSlots || 0;

      fillSelects(vehicles, zones);
      fillActiveVehicles(vehicles);

      showMessage("Dữ liệu bãi xe đã được tải thành công.", true);
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Không tải được dữ liệu bãi xe.", false);
    }
  }

  async function checkinVehicle() {
    try {
      const vehicleSelect = document.getElementById("fixVehicleSelect");
      const zoneSelect = document.getElementById("fixZoneSelect");

      const plate = vehicleSelect ? vehicleSelect.value : "";
      const zoneKey = zoneSelect ? zoneSelect.value : "";

      if (!plate) {
        showMessage("Vui lòng chọn xe chưa gửi trong bãi.", false);
        return;
      }

      if (!zoneKey) {
        showMessage("Vui lòng chọn khu còn chỗ trống.", false);
        return;
      }

      showMessage("Đang xác nhận gửi xe...", true);

      const result = await callPost("/api/student/parking/checkin", {
        plate: plate,
        zoneKey: zoneKey
      });

      if (!result || result.success === false) {
        showMessage(result?.message || "Gửi xe không thành công.", false);
        return;
      }

      showMessage(result.message || "Gửi xe thành công. Dữ liệu đã đồng bộ sang Admin.", true);
      await loadParkingData();
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Không gửi được xe.", false);
    }
  }

  async function checkoutVehicle() {
    try {
      const vehicleResult = await callGet("/api/student/vehicles");
      const active = (vehicleResult.vehicles || []).filter((vehicle) => vehicle.status === "parking");

      if (active.length === 0) {
        showMessage("Bạn chưa có xe nào đang gửi trong bãi.", false);
        return;
      }

      const plate = active[0].plate;

      showMessage("Đang xác nhận lấy xe " + plate + "...", true);

      const result = await callPost("/api/student/parking/checkout", {
        plate: plate
      });

      if (!result || result.success === false) {
        showMessage(result?.message || "Lấy xe không thành công.", false);
        return;
      }

      showMessage(result.message || "Lấy xe thành công.", true);
      await loadParkingData();
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Không lấy được xe.", false);
    }
  }

  function bindButtons() {
    const checkinBtn = document.getElementById("fixCheckinBtn");
    const checkoutBtn = document.getElementById("fixCheckoutBtn");
    const reloadBtn = document.getElementById("fixReloadBtn");
    const goVehiclesBtn = document.getElementById("fixGoVehiclesBtn");

    if (checkinBtn) checkinBtn.addEventListener("click", checkinVehicle);
    if (checkoutBtn) checkoutBtn.addEventListener("click", checkoutVehicle);
    if (reloadBtn) reloadBtn.addEventListener("click", loadParkingData);
    if (goVehiclesBtn) {
      goVehiclesBtn.addEventListener("click", function () {
        window.location.href = "student-vehicles.html";
      });
    }
  }

  function init() {
    if (!location.pathname.includes("student-parking")) return;

    createPanel();
    bindButtons();
    loadParkingData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

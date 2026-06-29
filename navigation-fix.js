/* ============================================================
   Smart UTT Parking - Navigation Fix
   Sửa toàn bộ nút điều hướng cho sinh viên và admin
   Giữ nguyên bố cục, chỉ thay cách bấm nút
============================================================ */

(function () {
  const ROUTES = {
    studentHome: "student-home.html",
    studentVehicles: "student-vehicles.html",
    studentWallet: "student-wallet.html",
    studentParking: "student-parking.html",
    studentHistory: "student-history.html",

    adminDashboard: "admin-dashboard.html",
    parkingSlot: "parking.html",
    parkingLayout: "parking_layout.html",

    login: "login_new.html",
    index: "index.html"
  };

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

  function cleanText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[🏠🚗🛵🏍️💰🅿️📜📊🚨⚙️📍🗺️✅❌]/g, "")
      .trim();
  }

  function currentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf("/") + 1) || "index.html";
  }

  function isStudentPage() {
    return currentPage().startsWith("student-");
  }

  function isAdminPage() {
    return [
      "admin-dashboard.html",
      "parking.html",
      "parking_layout.html",
      "parking-layout.html"
    ].includes(currentPage());
  }

  function goTo(url) {
    if (!url) return;

    if (url.includes("#")) {
      const [page, hash] = url.split("#");

      if (page === currentPage()) {
        window.location.hash = hash;
        scrollToHash(hash);
        return;
      }
    }

    window.location.href = url;
  }

  function logout() {
    const ok = confirm("Bạn có chắc chắn muốn đăng xuất không?");

    if (!ok) return;

    localStorage.removeItem("smart_utt_current_user");
    localStorage.removeItem("smart_utt_auth_token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("utt_current_user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");

    window.location.href = ROUTES.login;
  }

  function scrollToHash(hash) {
    if (!hash) return;

    const target = document.getElementById(hash);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  function setAdminSectionIds() {
    const all = Array.from(document.querySelectorAll("section, div, main, article"));

    all.forEach((element) => {
      const text = cleanText(element.innerText || "");

      if (!document.getElementById("active-vehicles") && text.includes("xe đang gửi trong bãi")) {
        element.id = "active-vehicles";
      }

      if (!document.getElementById("zones") && text.includes("thống kê theo khu")) {
        element.id = "zones";
      }

      if (!document.getElementById("alerts") && text.includes("cảnh báo từ bãi xe")) {
        element.id = "alerts";
      }

      if (!document.getElementById("quick-actions") && text.includes("quản lý nhanh")) {
        element.id = "quick-actions";
      }
    });
  }

  function resolveRouteByText(text) {
    const user = getCurrentUser();
    const role = user ? user.role : "";

    const t = cleanText(text);

    if (!t) return null;

    if (t.includes("đăng xuất")) {
      return "__logout__";
    }

    if (t === "trang chủ" || t.includes("mở trang chủ")) {
      if (role === "admin" || isAdminPage()) return ROUTES.adminDashboard;
      if (role === "student" || isStudentPage()) return ROUTES.studentHome;
      return ROUTES.index;
    }

    if (t.includes("xe của tôi") || t.includes("mở xe của tôi")) {
      return ROUTES.studentVehicles;
    }

    if (t.includes("ví") || t.includes("nạp tiền") || t.includes("mở ví")) {
      return ROUTES.studentWallet;
    }

    if (t === "bãi xe" || t.includes("mở bãi xe")) {
      return ROUTES.studentParking;
    }

    if (t.includes("lịch sử")) {
      return ROUTES.studentHistory;
    }

    if (t.includes("tổng quan")) {
      return ROUTES.adminDashboard;
    }

    if (t.includes("xe đang gửi")) {
      return ROUTES.adminDashboard + "#active-vehicles";
    }

    if (t.includes("theo khu")) {
      return ROUTES.adminDashboard + "#zones";
    }

    if (t.includes("cảnh báo")) {
      return ROUTES.adminDashboard + "#alerts";
    }

    if (t.includes("quản lý nhanh")) {
      return ROUTES.adminDashboard + "#quick-actions";
    }

    if (t.includes("parking slot")) {
      return ROUTES.parkingSlot;
    }

    if (t.includes("bản đồ bãi xe") || t.includes("parking layout")) {
      return ROUTES.parkingLayout;
    }

    if (t.includes("tải lại dữ liệu") || t.includes("đồng bộ toàn bộ")) {
      return "__reload__";
    }

    return null;
  }

  function shouldBind(element) {
    if (!element) return false;

    const tag = element.tagName.toLowerCase();

    if (["a", "button"].includes(tag)) return true;

    const className = String(element.className || "").toLowerCase();

    return (
      className.includes("nav") ||
      className.includes("menu") ||
      className.includes("sidebar") ||
      className.includes("card") ||
      className.includes("quick") ||
      element.getAttribute("role") === "button"
    );
  }

  function bindNavigation() {
    const elements = Array.from(
      document.querySelectorAll("a, button, .nav-item, .nav-link, .menu-item, .sidebar a, .sidebar button, .card, .quick-card, [role='button']")
    );

    elements.forEach((element) => {
      if (!shouldBind(element)) return;

      const route = resolveRouteByText(element.innerText || element.textContent || "");

      if (!route) return;

      element.style.cursor = "pointer";
      element.setAttribute("data-smart-route", route);

      element.addEventListener(
        "click",
        function (event) {
          const routeNow = element.getAttribute("data-smart-route");

          if (!routeNow) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          if (routeNow === "__logout__") {
            logout();
            return;
          }

          if (routeNow === "__reload__") {
            window.location.reload();
            return;
          }

          goTo(routeNow);
        },
        true
      );
    });
  }

  function setActiveMenu() {
    const page = currentPage();

    document.querySelectorAll("[data-smart-route]").forEach((element) => {
      const route = element.getAttribute("data-smart-route");

      if (!route || route.startsWith("__")) return;

      const routePage = route.split("#")[0];

      if (routePage === page) {
        element.classList.add("active");
        element.classList.add("is-active");
      }
    });
  }

  function fixEmptyLinks() {
    document.querySelectorAll("a[href='#'], a[href=''], a:not([href])").forEach((a) => {
      const route = resolveRouteByText(a.innerText || a.textContent || "");

      if (!route || route.startsWith("__")) return;

      a.setAttribute("href", route);
    });
  }

  function protectWrongRole() {
    const user = getCurrentUser();

    if (!user) return;

    if (isStudentPage() && user.role !== "student") {
      window.location.href = ROUTES.adminDashboard;
      return;
    }

    if (isAdminPage() && user.role !== "admin") {
      window.location.href = ROUTES.studentHome;
    }
  }

  function initNavigationFix() {
    setAdminSectionIds();
    fixEmptyLinks();
    bindNavigation();
    setActiveMenu();
    protectWrongRole();

    if (window.location.hash) {
      setTimeout(() => {
        scrollToHash(window.location.hash.replace("#", ""));
      }, 300);
    }

    console.log("✅ Navigation Fix đã kích hoạt: toàn bộ nút menu đã được gắn lại.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigationFix);
  } else {
    initNavigationFix();
  }
})();

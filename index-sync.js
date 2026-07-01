/* ============================================================
   Smart UTT Parking - Index Sync
   Đồng bộ trang chủ với đăng nhập + dữ liệu Supabase
   Khối trạng thái bãi xe được đưa xuống cuối trang chủ
============================================================ */

(function () {
    const LOGIN_PAGE = "login_new.html";
    const ADMIN_HOME = "admin-dashboard.html";
    const STUDENT_HOME = "student-home.html";

    function getCurrentUser() {
        const keys = [
            "smart_utt_current_user",
            "currentUser",
            "utt_current_user"
        ];

        for (const key of keys) {
            const raw = localStorage.getItem(key);

            if (!raw) continue;

            try {
                const user = JSON.parse(raw);

                if (user && user.role) {
                    return user;
                }
            } catch (error) {}
        }

        return null;
    }

    function getUserName(user) {
        if (!user) return "Khách";

        return (
            user.fullName ||
            user.full_name ||
            user.name ||
            user.username ||
            "Người dùng"
        );
    }

    function getUserCode(user) {
        if (!user) return "";

        return (
            user.studentCode ||
            user.student_code ||
            user.username ||
            ""
        );
    }

    function getRoleText(role) {
        if (role === "admin") return "Quản trị viên";
        if (role === "student") return "Sinh viên";

        return role || "Người dùng";
    }

    function getHomeByRole(role) {
        if (role === "admin") return ADMIN_HOME;
        if (role === "student") return STUDENT_HOME;

        return LOGIN_PAGE;
    }

    function logoutIndex() {
        const ok = confirm("Bạn có chắc chắn muốn đăng xuất không?");

        if (!ok) return;

        localStorage.removeItem("smart_utt_current_user");
        localStorage.removeItem("smart_utt_auth_token");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("utt_current_user");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userRole");

        window.location.href = "index.html";
    }

    function money(value) {
        return Number(value || 0).toLocaleString("vi-VN") + "đ";
    }

    function zoneDisplayName(zoneKey) {
        const map = {
            student1: "Khu gửi xe 1",
            bike2: "Khu gửi xe 2",
            bike3: "Khu gửi xe 3",
            teacher: "Khu giáo viên/KTX",
            car: "Khu ô tô"
        };

        return map[zoneKey] || zoneKey || "---";
    }

    function injectStyle() {
        if (document.getElementById("indexSyncStyle")) return;

        const style = document.createElement("style");
        style.id = "indexSyncStyle";

        style.textContent = `
            .index-auth-bar {
                max-width: 1180px;
                margin: 22px auto;
                padding: 0 24px;
            }

            .index-auth-box {
                background: white;
                border: 1px solid #dbeafe;
                border-radius: 22px;
                padding: 20px 22px;
                box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 18px;
                flex-wrap: wrap;
            }

            .index-auth-left {
                display: flex;
                align-items: center;
                gap: 14px;
            }

            .index-auth-avatar {
                width: 54px;
                height: 54px;
                border-radius: 18px;
                background: #0d6efd;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 900;
                font-size: 22px;
            }

            .index-auth-left strong {
                color: #1e3a8a;
                display: block;
                font-size: 18px;
            }

            .index-auth-left span {
                color: #64748b;
                font-weight: 700;
                font-size: 14px;
            }

            .index-auth-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }

            .index-sync-btn {
                border: none;
                border-radius: 999px;
                padding: 12px 18px;
                font-weight: 900;
                cursor: pointer;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .index-sync-btn.primary {
                background: #0d6efd;
                color: white;
            }

            .index-sync-btn.red {
                background: #ef4444;
                color: white;
            }

            .index-data-panel {
                max-width: 1180px;
                margin: 46px auto 42px;
                padding: 0 24px;
                clear: both;
            }

            .index-data-card {
                background: white;
                border: 1px solid #dbeafe;
                border-radius: 26px;
                padding: 26px;
                box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
            }

            .index-data-head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 18px;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }

            .index-data-head h2 {
                color: #1e3a8a;
                font-size: 28px;
                margin: 0 0 8px;
            }

            .index-data-head p {
                color: #64748b;
                margin: 0;
                line-height: 1.6;
                font-weight: 600;
            }

            .index-refresh {
                background: #0d6efd;
                color: white;
                border: none;
                border-radius: 14px;
                padding: 12px 16px;
                font-weight: 900;
                cursor: pointer;
            }

            .index-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 20px;
            }

            .index-stat {
                background: #f8fbff;
                border: 1px solid #dbeafe;
                border-radius: 18px;
                padding: 18px;
            }

            .index-stat span {
                display: block;
                color: #64748b;
                font-weight: 800;
                margin-bottom: 8px;
            }

            .index-stat strong {
                color: #1e3a8a;
                font-size: 28px;
                font-weight: 900;
            }

            .index-zone-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 14px;
            }

            .index-zone {
                background: #f8fbff;
                border: 1px solid #dbeafe;
                border-radius: 18px;
                padding: 16px;
            }

            .index-zone h3 {
                color: #1e3a8a;
                font-size: 17px;
                margin: 0 0 10px;
            }

            .index-zone p {
                color: #64748b;
                margin: 6px 0;
                font-weight: 700;
            }

            .index-zone-progress {
                height: 9px;
                background: #e2e8f0;
                border-radius: 999px;
                overflow: hidden;
                margin: 12px 0;
            }

            .index-zone-progress span {
                display: block;
                height: 100%;
                background: linear-gradient(90deg, #22c55e, #0d6efd);
                border-radius: 999px;
                transition: width 0.3s ease;
            }

            @media (max-width: 900px) {
                .index-stats-grid,
                .index-zone-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 600px) {
                .index-stats-grid,
                .index-zone-grid {
                    grid-template-columns: 1fr;
                }

                .index-auth-box {
                    align-items: flex-start;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function ensureAuthBar() {
        let bar = document.getElementById("indexAuthBar");

        if (bar) return bar;

        bar = document.createElement("section");
        bar.id = "indexAuthBar";
        bar.className = "index-auth-bar";

        const header =
            document.querySelector("header") ||
            document.querySelector(".header") ||
            document.querySelector(".navbar");

        if (header && header.parentNode) {
            header.insertAdjacentElement("afterend", bar);
        } else {
            document.body.insertBefore(bar, document.body.firstChild);
        }

        return bar;
    }

    function renderAuthBar() {
        const user = getCurrentUser();
        const bar = ensureAuthBar();

        if (!user) {
            bar.innerHTML = `
                <div class="index-auth-box">
                    <div class="index-auth-left">
                        <div class="index-auth-avatar">P</div>
                        <div>
                            <strong>Bạn chưa đăng nhập</strong>
                            <span>Đăng nhập để sử dụng chức năng sinh viên hoặc quản trị.</span>
                        </div>
                    </div>

                    <div class="index-auth-actions">
                        <a class="index-sync-btn primary" href="${LOGIN_PAGE}">Đăng nhập</a>
                    </div>
                </div>
            `;

            updateHeaderLoginLink(null);
            return;
        }

        const home = getHomeByRole(user.role);
        const roleText = getRoleText(user.role);
        const name = getUserName(user);
        const code = getUserCode(user);
        const firstLetter = user.role === "admin" ? "A" : "S";

        bar.innerHTML = `
            <div class="index-auth-box">
                <div class="index-auth-left">
                    <div class="index-auth-avatar">${firstLetter}</div>
                    <div>
                        <strong>Đang đăng nhập: ${name}</strong>
                        <span>${roleText}${code ? " · " + code : ""}</span>
                    </div>
                </div>

                <div class="index-auth-actions">
                    <a class="index-sync-btn primary" href="${home}">
                        ${user.role === "admin" ? "Vào trang quản trị" : "Vào cổng sinh viên"}
                    </a>
                    <button class="index-sync-btn red" type="button" onclick="logoutIndex()">Đăng xuất</button>
                </div>
            </div>
        `;

        updateHeaderLoginLink(user);
    }

    function updateHeaderLoginLink(user) {
        const links = Array.from(document.querySelectorAll("a, button"));

        links.forEach(function (element) {
            const text = String(element.textContent || "").toLowerCase().trim();
            const href = String(element.getAttribute("href") || "").toLowerCase();

            const isLoginButton =
                text.includes("đăng nhập") ||
                href.includes("login") ||
                href.includes("login_new");

            if (!isLoginButton) return;

            if (!user) {
                if (element.tagName.toLowerCase() === "a") {
                    element.setAttribute("href", LOGIN_PAGE);
                }

                element.textContent = "Đăng nhập";
                return;
            }

            const home = getHomeByRole(user.role);

            if (element.tagName.toLowerCase() === "a") {
                element.setAttribute("href", home);
            } else {
                element.onclick = function () {
                    window.location.href = home;
                };
            }

            element.textContent = user.role === "admin" ? "Vào Admin" : "Vào cổng sinh viên";
        });
    }

    function ensureDataPanel() {
        let panel = document.getElementById("indexDataPanel");

        if (panel) return panel;

        panel = document.createElement("section");
        panel.id = "indexDataPanel";
        panel.className = "index-data-panel";

        const footer = document.querySelector("footer, .footer");

        if (footer && footer.parentNode) {
            footer.insertAdjacentElement("beforebegin", panel);
            return panel;
        }

        const scripts = document.querySelectorAll("script");
        const firstScript = scripts.length ? scripts[0] : null;

        if (firstScript && firstScript.parentNode === document.body) {
            document.body.insertBefore(panel, firstScript);
            return panel;
        }

        document.body.appendChild(panel);
        return panel;
    }

    function setTextByIds(ids, value) {
        ids.forEach(function (id) {
            const el = document.getElementById(id);

            if (el) {
                el.textContent = value;
            }
        });
    }

    async function waitApiReady() {
        if (window.smartUttApiGet || window.apiGet) return;

        await new Promise(function (resolve, reject) {
            const existed = document.querySelector("script[data-index-sync-api]");

            if (existed) {
                existed.addEventListener("load", resolve);
                existed.addEventListener("error", reject);
                return;
            }

            const script = document.createElement("script");
            script.src = "api.js?v=" + Date.now();
            script.setAttribute("data-index-sync-api", "true");

            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("Không tải được api.js"));
            };

            document.head.appendChild(script);
        });
    }

    async function callGet(path) {
        await waitApiReady();

        if (window.smartUttApiGet) {
            return await window.smartUttApiGet(path);
        }

        if (window.apiGet) {
            return await window.apiGet(path);
        }

        throw new Error("Không tìm thấy apiGet.");
    }

    function normalizeStats(data) {
        const stats = data.stats || data || {};

        return {
            totalSlots: Number(stats.totalSlots || stats.total_slots || 0),
            emptySlots: Number(stats.emptySlots || stats.empty_slots || stats.availableSlots || 0),
            usedSlots: Number(stats.usedSlots || stats.used_slots || stats.occupiedSlots || 0),
            warningSlots: Number(stats.warningSlots || stats.warning_slots || 0),
            todayRevenue: Number(stats.todayRevenue || stats.today_revenue || 0)
        };
    }

    function normalizeZone(zone) {
        const zoneKey = zone.zoneKey || zone.zone_key || zone.id || "";
        const zoneName =
            zone.zoneName ||
            zone.zone_name ||
            zone.name ||
            zoneDisplayName(zoneKey);

        const vehicleType =
            zone.vehicleType ||
            zone.vehicle_type ||
            "Xe máy";

        const total = Number(zone.totalSlots || zone.total_slots || 0);
        const empty = Number(zone.emptySlots || zone.empty_slots || zone.availableSlots || 0);
        const used = Number(zone.usedSlots || zone.used_slots || zone.occupiedSlots || 0);
        const warning = Number(zone.warningSlots || zone.warning_slots || 0);
        const density = total === 0 ? 0 : Math.round((used / total) * 100);

        return {
            zoneKey,
            zoneName,
            vehicleType,
            total,
            empty,
            used,
            warning,
            density
        };
    }

    function updateHomeDensity(stats) {
        const total = Number(stats.totalSlots || 0);
        const used = Number(stats.usedSlots || 0);
        const density = total === 0 ? 0 : Math.round((used / total) * 100);
        const densityText = density + "%";

        setTextByIds(
            [
                "densityText",
                "usageDensity",
                "homeDensity",
                "usagePercent",
                "densityPercent",
                "indexDensity"
            ],
            densityText
        );

        const possibleBars = document.querySelectorAll(`
            #densityBar,
            #usageBar,
            #homeDensityBar,
            #densityProgress,
            .density-bar,
            .usage-bar,
            .usage-progress,
            .progress-fill,
            .progress-bar span,
            .progress span
        `);

        possibleBars.forEach(function (bar) {
            if (!bar.closest("#indexDataPanel")) {
                bar.style.width = density + "%";
            }
        });

        const allElements = Array.from(document.querySelectorAll("body *"));

        allElements.forEach(function (element) {
            const text = String(element.textContent || "").trim();

            if (text === "0%" || text === "0 %" || text.match(/^\d+%$/)) {
                const parentText = String(element.parentElement?.textContent || "").toLowerCase();

                if (
                    parentText.includes("mật độ") ||
                    parentText.includes("sử dụng")
                ) {
                    element.textContent = densityText;
                }
            }
        });

        allElements.forEach(function (element) {
            const text = String(element.textContent || "").toLowerCase();

            if (!text.includes("mật độ sử dụng")) return;

            const container =
                element.closest(".card") ||
                element.closest(".stat-card") ||
                element.closest(".panel") ||
                element.closest("section") ||
                element.parentElement;

            if (!container) return;

            const percentElements = Array.from(container.querySelectorAll("strong, span, b, div, p"));

            percentElements.forEach(function (item) {
                const itemText = String(item.textContent || "").trim();

                if (itemText.match(/^\d+%$/)) {
                    item.textContent = densityText;
                }
            });

            const bars = container.querySelectorAll(".progress-fill, .progress-bar span, .progress span, .usage-bar, .density-bar");

            bars.forEach(function (bar) {
                bar.style.width = density + "%";
            });
        });
    }

    async function loadIndexData() {
        const panel = ensureDataPanel();

        try {
            panel.innerHTML = `
                <div class="index-data-card">
                    <div class="index-data-head">
                        <div>
                            <h2>Trạng thái bãi xe hiện tại</h2>
                            <p>Đang tải dữ liệu từ Supabase...</p>
                        </div>
                    </div>
                </div>
            `;

            const statsData = await callGet("/api/stats");
            const zoneData = await callGet("/api/student/parking/zones");

            const stats = normalizeStats(statsData);
            const zones = (zoneData.zones || []).map(normalizeZone);

            setTextByIds(["totalSlots", "statTotal", "homeTotalSlots", "indexTotalSlots"], stats.totalSlots);
            setTextByIds(["emptySlots", "statEmpty", "homeEmptySlots", "indexEmptySlots"], stats.emptySlots);
            setTextByIds(["usedSlots", "statUsed", "occupiedSlots", "homeUsedSlots", "indexUsedSlots"], stats.usedSlots);
            setTextByIds(["warningSlots", "statWarning", "violationSlots", "homeWarningSlots"], stats.warningSlots);

            updateHomeDensity(stats);

            panel.innerHTML = `
                <div class="index-data-card">
                    <div class="index-data-head">
                        <div>
                            <h2>Trạng thái bãi xe hiện tại</h2>
                            <p>
                                Số liệu được đồng bộ với trang sinh viên, Admin Dashboard,
                                Parking Slot và Bản đồ bãi xe.
                            </p>
                        </div>

                        <button class="index-refresh" type="button" onclick="loadIndexData()">
                            Tải lại dữ liệu
                        </button>
                    </div>

                    <div class="index-stats-grid">
                        <div class="index-stat">
                            <span>Tổng ô</span>
                            <strong>${stats.totalSlots}</strong>
                        </div>

                        <div class="index-stat">
                            <span>Còn trống</span>
                            <strong>${stats.emptySlots}</strong>
                        </div>

                        <div class="index-stat">
                            <span>Đang có xe</span>
                            <strong>${stats.usedSlots}</strong>
                        </div>

                        <div class="index-stat">
                            <span>Cảnh báo</span>
                            <strong>${stats.warningSlots}</strong>
                        </div>
                    </div>

                    <div class="index-zone-grid">
                        ${
                            zones.length
                                ? zones.map(function (zone) {
                                    return `
                                        <div class="index-zone">
                                            <h3>${zone.vehicleType === "Ô tô" ? "🚗" : "🏍️"} ${zone.zoneName}</h3>
                                            <p>Tổng ô: <strong>${zone.total}</strong></p>
                                            <p>Còn trống: <strong>${zone.empty}</strong></p>
                                            <p>Đang có xe: <strong>${zone.used}</strong></p>
                                            <p>Cảnh báo: <strong>${zone.warning}</strong></p>

                                            <div class="index-zone-progress">
                                                <span style="width:${Math.max(zone.density, 3)}%;"></span>
                                            </div>

                                            <p>Mật độ: <strong>${zone.density}%</strong></p>
                                        </div>
                                    `;
                                }).join("")
                                : `
                                    <div class="index-zone">
                                        <h3>Chưa có dữ liệu khu gửi xe</h3>
                                        <p>Kiểm tra lại dữ liệu Supabase.</p>
                                    </div>
                                `
                        }
                    </div>
                </div>
            `;

            updateHomeDensity(stats);
        } catch (error) {
            console.error(error);

            panel.innerHTML = `
                <div class="index-data-card">
                    <div class="index-data-head">
                        <div>
                            <h2>Trạng thái bãi xe hiện tại</h2>
                            <p style="color:#991b1b;font-weight:800;">
                                ${error.message || "Không tải được dữ liệu trang chủ."}
                            </p>
                        </div>

                        <button class="index-refresh" type="button" onclick="loadIndexData()">
                            Tải lại dữ liệu
                        </button>
                    </div>
                </div>
            `;
        }
    }

    function fixHomeLinks() {
        document.querySelectorAll('a[href="index.html"], a[href="./index.html"], a[href="/index.html"]').forEach(function (link) {
            link.addEventListener("click", function () {
                localStorage.setItem("smart_utt_last_home_click", new Date().toISOString());
            });
        });
    }

    function init() {
        injectStyle();
        renderAuthBar();
        fixHomeLinks();
        loadIndexData();
    }

    window.logoutIndex = logoutIndex;
    window.loadIndexData = loadIndexData;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

/**
 * LOGIKA UTAMA ADMIN PANEL & CMS SD NEGERI SUMBEREJO
 * Mengelola Otentikasi, Router, Hak Akses Peran, dan Integrasi API
 */

(function () {
  const getProxyUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.PROXY_URL) ? window.APP_CONFIG.PROXY_URL : "/api/gas";
  };

  const getDirectGasUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : "";
  };

  const realtimeChannel = ("BroadcastChannel" in window) ? new BroadcastChannel("sdn_cms_realtime") : null;

  function broadcastRealtimeChange(action, detail = {}) {
    if (realtimeChannel) {
      try {
        realtimeChannel.postMessage({ action, time: Date.now(), ...detail });
      } catch (e) {}
    }
  }

  function updateGasSyncBadge(state, text) {
    const badge = document.getElementById("gasSyncBadge");
    const dot = document.getElementById("gasSyncDot");
    const label = document.getElementById("gasSyncText");
    if (!badge || !dot || !label) return;

    if (state === "syncing") {
      badge.style.background = "#fef9c3";
      badge.style.color = "#854d0e";
      badge.style.borderColor = "#fde047";
      dot.style.background = "#eab308";
      label.textContent = text || "Menyinkronkan ke Google Sheets...";
    } else if (state === "error") {
      badge.style.background = "#fee2e2";
      badge.style.color = "#991b1b";
      badge.style.borderColor = "#fca5a5";
      dot.style.background = "#dc2626";
      label.textContent = text || "Mode Cache Lokal";
    } else {
      badge.style.background = "#dcfce7";
      badge.style.color = "#15803d";
      badge.style.borderColor = "#86efac";
      dot.style.background = "#16a34a";
      label.textContent = text || "GAS Realtime Aktif";
    }
  }

  // State Aplikasi Sesi
  const AppState = {
    token: sessionStorage.getItem("cms_token") || null,
    user: null, // { namaPengguna, namaTampil, peran }
    activeView: "dashboard",
    siteConfig: {},
    pendaftarList: [],
    mediaList: [],
    collections: {}
  };

  /**
   * Pemanggilan API Admin Terpusat (Write-Through Cache /api/gas <10ms + Sinkronisasi Latar Belakang ke Google Apps Script)
   */
  async function apiCall(action, payload = {}) {
    const proxyUrl = getProxyUrl();
    const directUrl = getDirectGasUrl();
    if (!proxyUrl && !directUrl) {
      showToast("URL API belum dikonfigurasi di assets/js/config.js", "error");
      throw new Error("API URL tidak ditemukan.");
    }

    const body = {
      action: action,
      token: AppState.token,
      ...payload
    };

    const isMutation =
      action.startsWith("admin_save") ||
      action.startsWith("admin_delete") ||
      action.startsWith("admin_toggle") ||
      action.startsWith("admin_update") ||
      action.startsWith("admin_upload");

    if (isMutation) {
      updateGasSyncBadge("syncing", "Menyimpan ke GAS...");
    }

    const doFetch = async (targetUrl, isDirectGas) => {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: isDirectGas
          ? { "Content-Type": "text/plain;charset=utf-8" }
          : { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.code === "UNAUTHORIZED") {
          logoutUser("Sesi Anda telah berakhir. Silakan masuk kembali.");
        }
        throw new Error(json.message || "Gagal memproses aksi.");
      }
      return json.data;
    };

    try {
      const data = await doFetch(proxyUrl, false);
      if (isMutation) {
        broadcastRealtimeChange(action);
      }
      return data;
    } catch (proxyErr) {
      if (proxyErr && proxyErr.message && !proxyErr.message.includes("Failed to fetch") && !proxyErr.message.includes("Unexpected token")) {
        updateGasSyncBadge("synced", "GAS Realtime Aktif");
        throw proxyErr;
      }
      if (!directUrl) throw proxyErr;
      const data = await doFetch(directUrl, true);
      updateGasSyncBadge("synced", "Tersinkron ke GAS");
      if (isMutation) {
        broadcastRealtimeChange(action);
      }
      return data;
    }
  }

  // ==========================================
  // 1. INISIALISASI & AUTENTIKASI
  // ==========================================
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOGIN_LOCKOUT_MS = 60 * 1000; // 60 detik penguncian setelah 5x salah
  const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // Auto-logout setelah 30 menit tidak aktif
  let inactivityTimer = null;

  document.addEventListener("DOMContentLoaded", () => {
    initSecurityGuards();
    initAuth();
    initNavigationEvents();
    initForms();
    initMediaUpload();
    initPendaftarEvents();
    initRealtimeAdminEvents();
  });

  /**
   * Perlindungan DOM & Sesi:
   * - Mencegah manipulasi DevTools (menghapus display:none pada #viewApp tanpa token valid)
   * - Mengunci ulang tampilan jika token sesi tidak valid
   * - Auto-logout saat sesi tidak aktif
   */
  function initSecurityGuards() {
    const viewApp = document.getElementById("viewApp");
    const viewLogin = document.getElementById("viewLogin");

    if (viewApp && "MutationObserver" in window) {
      const observer = new MutationObserver(() => {
        if (!AppState.token || !AppState.user) {
          if (viewApp.style.display !== "none" || !viewApp.hasAttribute("hidden")) {
            viewApp.style.display = "none";
            viewApp.setAttribute("hidden", "hidden");
            viewApp.setAttribute("aria-hidden", "true");
          }
          if (viewLogin && viewLogin.style.display === "none") {
            viewLogin.style.display = "flex";
          }
        }
      });
      observer.observe(viewApp, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
    }

    const resetInactivity = () => {
      if (!AppState.token || !AppState.user) return;
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (AppState.token) {
          logoutUser("Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit.");
        }
      }, SESSION_INACTIVITY_MS);
    };

    ["click", "keydown", "mousemove", "touchstart"].forEach((evt) => {
      window.addEventListener(evt, resetInactivity, { passive: true });
    });
  }

  function getLoginThrottleState() {
    try {
      const raw = sessionStorage.getItem("cms_login_throttle");
      return raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
    } catch {
      return { count: 0, lockUntil: 0 };
    }
  }

  function setLoginThrottleState(state) {
    try {
      sessionStorage.setItem("cms_login_throttle", JSON.stringify(state));
    } catch {}
  }

  function initRealtimeAdminEvents() {
    const syncBtn = document.getElementById("btnSyncGasNow");
    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        if (!AppState.token || !AppState.user) return;
        const orig = syncBtn.textContent;
        syncBtn.disabled = true;
        syncBtn.textContent = "⏳ Menyinkronkan...";
        updateGasSyncBadge("syncing", "Menarik data Google Sheets...");
        try {
          const res = await fetch("/api/gas-sync", { method: "POST" });
          const json = await res.json();
          if (json && json.ok) {
            await loadAllData();
            updateGasSyncBadge("synced", "GAS Tersinkron");
            showToast("Data berhasil disinkronkan langsung dari Google Sheets!", "success");
          } else {
            throw new Error((json && json.message) || "Gagal sinkronisasi");
          }
        } catch (err) {
          updateGasSyncBadge("error", "Gagal Sinkron GAS");
          showToast("Gagal menarik data dari Google Apps Script: " + err.message, "error");
        } finally {
          syncBtn.disabled = false;
          syncBtn.textContent = orig;
        }
      });
    }

    if ("EventSource" in window && window.APP_CONFIG && window.APP_CONFIG.SSE_URL) {
      try {
        const es = new EventSource(window.APP_CONFIG.SSE_URL);
        es.addEventListener("gas_syncing", (ev) => {
          try {
            const d = JSON.parse(ev.data);
            updateGasSyncBadge("syncing", `Sinkron GAS (${d.action})...`);
          } catch (e) {}
        });
        es.addEventListener("gas_synced", () => {
          updateGasSyncBadge("synced", "GAS Tersinkron Realtime");
        });
        es.addEventListener("gas_sync_error", () => {
          updateGasSyncBadge("error", "Mode Cache Lokal");
        });
        es.addEventListener("cms_update", (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (d && d.bundle && d.bundle.config) {
              AppState.siteConfig = { ...AppState.siteConfig, ...d.bundle.config };
              localStorage.setItem("sdn_site_config", JSON.stringify(AppState.siteConfig));
            }
          } catch (e) {}
        });
      } catch (e) {}
    }
  }

  async function initAuth() {
    if (!AppState.token) {
      showLoginView();
      return;
    }

    try {
      // Verifikasi token sesi ke backend sebelum membuka App Shell
      const me = await apiCall("admin_me");
      if (!me || !me.pengguna) {
        throw new Error("Sesi tidak valid.");
      }
      AppState.user = me.pengguna;
      showAppView();
    } catch (e) {
      sessionStorage.removeItem("cms_token");
      AppState.token = null;
      AppState.user = null;
      showLoginView();
    }
  }

  function showLoginView() {
    const viewLogin = document.getElementById("viewLogin");
    const viewApp = document.getElementById("viewApp");

    if (viewApp) {
      viewApp.style.display = "none";
      viewApp.setAttribute("hidden", "hidden");
      viewApp.setAttribute("aria-hidden", "true");
    }
    if (viewLogin) {
      viewLogin.style.display = "flex";
    }

    const btnLoginGoogle = document.getElementById("btnLoginGoogle");
    if (btnLoginGoogle) {
      btnLoginGoogle.onclick = async () => {
        const alertBox = document.getElementById("loginAlert");
        alertBox.style.display = "none";
        const origHtml = btnLoginGoogle.innerHTML;
        btnLoginGoogle.disabled = true;
        btnLoginGoogle.textContent = "⏳ Membuka Google Sign-In...";

        try {
          if (!window.FirebaseAdminAuth) {
            throw new Error("Modul Firebase sedang diinisialisasi. Silakan coba kembali dalam 2 detik.");
          }
          const result = await window.FirebaseAdminAuth.loginWithGoogle();
          setLoginThrottleState({ count: 0, lockUntil: 0 });
          AppState.token = result.token;
          AppState.user = result.pengguna;
          sessionStorage.setItem("cms_token", result.token);
          showAppView();
          showToast(`Selamat datang, ${AppState.user.namaTampil}! (Firebase Auth)`, "success");
        } catch (err) {
          alertBox.className = "card";
          alertBox.style.borderLeft = "4px solid var(--danger)";
          alertBox.style.background = "var(--danger-bg)";
          alertBox.style.display = "block";
          alertBox.style.color = "var(--danger)";
          alertBox.textContent = err.message || "Gagal masuk via Firebase Google Auth.";
        } finally {
          btnLoginGoogle.disabled = false;
          btnLoginGoogle.innerHTML = origHtml;
        }
      };
    }

    const formLogin = document.getElementById("formLogin");
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById("btnLogin");
      const alertBox = document.getElementById("loginAlert");
      alertBox.style.display = "none";

      const throttle = getLoginThrottleState();
      const now = Date.now();
      if (throttle.lockUntil && now < throttle.lockUntil) {
        const waitSec = Math.ceil((throttle.lockUntil - now) / 1000);
        alertBox.className = "card";
        alertBox.style.borderLeft = "4px solid var(--danger)";
        alertBox.style.background = "var(--danger-bg)";
        alertBox.style.display = "block";
        alertBox.style.color = "var(--danger)";
        alertBox.textContent = `Terlalu banyak percobaan gagal. Silakan tunggu ${waitSec} detik sebelum mencoba kembali.`;
        return;
      }

      btn.disabled = true;
      btn.textContent = "Memeriksa kredensial...";

      try {
        const username = document.getElementById("inputUsername").value.trim();
        const password = document.getElementById("inputPassword").value.trim();

        const result = await apiCall("admin_login", {
          namaPengguna: username,
          kataSandi: password
        });

        setLoginThrottleState({ count: 0, lockUntil: 0 });
        AppState.token = result.token;
        AppState.user = result.pengguna;
        sessionStorage.setItem("cms_token", result.token);

        const passInput = document.getElementById("inputPassword");
        if (passInput) passInput.value = "";

        showAppView();
        showToast(`Selamat datang, ${AppState.user.namaTampil}!`, "success");
      } catch (err) {
        const current = getLoginThrottleState();
        const nextCount = (current.count || 0) + 1;
        const lockUntil = nextCount >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOGIN_LOCKOUT_MS : 0;
        setLoginThrottleState({ count: nextCount >= MAX_LOGIN_ATTEMPTS ? 0 : nextCount, lockUntil });

        alertBox.className = "card";
        alertBox.style.borderLeft = "4px solid var(--danger)";
        alertBox.style.background = "var(--danger-bg)";
        alertBox.style.display = "block";
        alertBox.style.color = "var(--danger)";
        alertBox.textContent = lockUntil
          ? "Batas percobaan login terlampaui. Akses dikunci sementara selama 60 detik."
          : err.message || "Nama pengguna atau kata sandi salah.";
      } finally {
        btn.disabled = false;
        btn.textContent = "Masuk ke Panel Pengelola";
      }
    };
  }

  function showAppView() {
    if (!AppState.token || !AppState.user) {
      showLoginView();
      return;
    }

    const viewLogin = document.getElementById("viewLogin");
    const viewApp = document.getElementById("viewApp");
    if (viewLogin) viewLogin.style.display = "none";
    if (viewApp) {
      viewApp.removeAttribute("hidden");
      viewApp.removeAttribute("aria-hidden");
      viewApp.style.display = "flex";
    }

    // Update Header Profil
    document.getElementById("labelUserName").textContent = AppState.user.namaTampil || AppState.user.namaPengguna;
    const rolePill = document.getElementById("labelUserRole");
    rolePill.textContent = formatRoleName(AppState.user.peran);
    rolePill.className = "role-pill " + AppState.user.peran;

    // Terapkan Pembatasan Peran pada Menu Navigasi
    applyRolePermissions(AppState.user.peran);

    // Muat data awal
    AppRouter.navigate("dashboard");
    loadAllData();
  }

  function logoutUser(msg = "Anda telah keluar.") {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
    if (AppState.token) {
      apiCall("admin_logout").catch(() => {});
    }
    sessionStorage.removeItem("cms_token");
    AppState.token = null;
    AppState.user = null;
    showLoginView();
    if (msg) showToast(msg);
  }

  document.getElementById("btnLogout").addEventListener("click", () => logoutUser());

  // ==========================================
  // 2. MATRIKS HAK AKSES PERAN
  // ==========================================
  function canRoleAccessView(role, viewName) {
    if (viewName === "dashboard") return true;
    if (role === "superadmin") return true;
    const kontenViews = ["identitas", "beranda", "profil", "pengumuman", "guru", "ekskul", "fasilitas", "galeri", "media"];
    const spmbViews = ["spmbConfig", "pendaftar"];
    if (role === "editor") return kontenViews.includes(viewName);
    if (role === "admin_spmb") return spmbViews.includes(viewName);
    return false;
  }

  function applyRolePermissions(role) {
    const kontenGroups = document.querySelectorAll(".role-group-konten, .role-item-konten");
    const spmbGroups = document.querySelectorAll(".role-group-spmb, .role-item-spmb");
    const superGroups = document.querySelectorAll(".role-group-super, .role-item-super");

    if (role === "superadmin") {
      kontenGroups.forEach((el) => (el.style.display = ""));
      spmbGroups.forEach((el) => (el.style.display = ""));
      superGroups.forEach((el) => (el.style.display = ""));
    } else if (role === "editor") {
      kontenGroups.forEach((el) => (el.style.display = ""));
      spmbGroups.forEach((el) => (el.style.display = "none"));
      superGroups.forEach((el) => (el.style.display = "none"));
    } else if (role === "admin_spmb") {
      kontenGroups.forEach((el) => (el.style.display = "none"));
      spmbGroups.forEach((el) => (el.style.display = ""));
      superGroups.forEach((el) => (el.style.display = "none"));
    }
  }

  function formatRoleName(r) {
    if (r === "superadmin") return "Superadmin";
    if (r === "editor") return "Editor Konten";
    if (r === "admin_spmb") return "Admin SPMB";
    return r;
  }

  // ==========================================
  // 3. ROUTER & NAVIGASI
  // ==========================================
  const AppRouter = {
    navigate: function (viewName) {
      if (!AppState.token || !AppState.user) {
        showLoginView();
        return;
      }

      if (!canRoleAccessView(AppState.user.peran, viewName)) {
        showToast("Akses ditolak: peran Anda tidak memiliki izin untuk membuka menu ini.", "error");
        viewName = "dashboard";
      }

      AppState.activeView = viewName;

      // Update Nav Items
      document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
        if (item.getAttribute("data-view") === viewName) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      // Tampilkan Pane yang Sesuai
      document.querySelectorAll(".view-pane").forEach((pane) => {
        pane.style.display = "none";
      });

      const targetPane = document.getElementById("pane-" + viewName);
      if (targetPane) targetPane.style.display = "block";

      // Update Judul Header
      const titles = {
        dashboard: "Dasbor Operasional",
        identitas: "Identitas Lembaga Sekolah",
        beranda: "Konten Halaman Beranda",
        profil: "Visi, Misi & Sejarah",
        spmbConfig: "Pengaturan Jadwal SPMB",
        pendaftar: "Verifikasi Pendaftar SPMB",
        pengumuman: "Kelola Pengumuman",
        guru: "Dewan Guru & Tenaga Didik",
        ekskul: "Program Ekstrakurikuler",
        fasilitas: "Fasilitas & Sarana",
        galeri: "Dokumentasi Galeri",
        media: "Pustaka Media Terunggah",
        users: "Manajemen Akun Admin",
        log: "Rekam Log Aktivitas"
      };
      document.getElementById("topPageTitle").textContent = titles[viewName] || "Admin Panel";

      // Muat data khusus view jika diperlukan
      if (viewName === "media") loadMediaLibrary();
      if (viewName === "pendaftar") loadPendaftarTable();
      if (viewName === "pengumuman") loadCollection("Pengumuman");
      if (viewName === "guru") loadCollection("Guru");
      if (viewName === "ekskul") loadCollection("Ekstrakurikuler");
      if (viewName === "fasilitas") loadCollection("Fasilitas");
      if (viewName === "galeri") loadCollection("Galeri");
      if (viewName === "users") loadUsersList();
      if (viewName === "log") loadAuditLog();

      // Tutup menu ponsel jika terbuka
      document.getElementById("sidebar").classList.remove("open");
    }
  };
  window.AppRouter = AppRouter;

  function initNavigationEvents() {
    document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const view = item.getAttribute("data-view");
        if (view) AppRouter.navigate(view);
      });
    });

    const toggleBtn = document.getElementById("btnToggleMenu");
    const sidebar = document.getElementById("sidebar");
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // ==========================================
  // 4. MEMUAT SEMUA DATA (BUNDLE)
  // ==========================================
  async function loadAllData() {
    try {
      const bundle = await apiCall("admin_getBundle");
      AppState.siteConfig = bundle.config || {};
      AppState.pendaftarList = bundle.pendaftar || [];

      if (bundle.config) {
        localStorage.setItem("sdn_site_config", JSON.stringify(bundle.config));
      }

      if (bundle.collections) {
        Object.keys(bundle.collections).forEach((sheetName) => {
          AppState.collections[sheetName] = bundle.collections[sheetName] || [];
          renderCollectionTable(sheetName, AppState.collections[sheetName]);
        });
      }

      // Isi nilai-nilai formulir
      populateForms(AppState.siteConfig);
      renderDashboard(bundle);
    } catch (e) {
      console.warn("Gagal memuat bundle lengkap admin:", e);
    }
  }

  function populateForms(cfg) {
    // Identitas
    const fId = document.getElementById("formIdentitas");
    if (fId) {
      ["namaSekolah", "akreditasi", "alamat", "telepon", "whatsapp", "email", "jamLayanan", "mapEmbedUrl"].forEach((k) => {
        if (fId[k] && cfg[k]) fId[k].value = cfg[k];
      });
    }

    // Beranda
    const fBer = document.getElementById("formBeranda");
    if (fBer) {
      ["sambutanKepsek", "jumlahSiswa", "jumlahGuru", "biayaPendaftaran"].forEach((k) => {
        if (fBer[k] && cfg[k]) fBer[k].value = cfg[k];
      });
    }

    // Profil
    const fProf = document.getElementById("formProfil");
    if (fProf) {
      ["visiTeks", "misiTeks", "sejarahTeks"].forEach((k) => {
        if (fProf[k] && cfg[k]) fProf[k].value = cfg[k];
      });
    }

    // SPMB Config
    const fSpmb = document.getElementById("formSpmbConfig");
    if (fSpmb) {
      ["spmbStatus", "spmbJadwalBerikutnya", "spmbMulai", "spmbSelesai", "batasHarianDaftar"].forEach((k) => {
        if (fSpmb[k] && cfg[k]) fSpmb[k].value = cfg[k];
      });
    }
  }

  function renderDashboard(bundle) {
    const pendaftar = bundle.pendaftar || [];
    const config = bundle.config || {};

    const baruCount = pendaftar.filter((p) => p.status === "baru").length;
    document.getElementById("statPendaftarBaru").textContent = baruCount;
    document.getElementById("statTotalPendaftar").textContent = pendaftar.length;
    if (bundle.pengumumanCount !== undefined) {
      document.getElementById("statPengumumanTayang").textContent = bundle.pengumumanCount;
    }

    const statusEl = document.getElementById("statStatusSpmb");
    statusEl.textContent = (config.spmbStatus || "tutup").toUpperCase();
    statusEl.style.color = config.spmbStatus === "buka" ? "var(--success)" : "var(--danger)";

    const tglSelesai = config.spmbSelesai || "-";
    document.getElementById("statTglSpmb").textContent = `Batas: ${tglSelesai}`;

    // Peringatan jika tanggal lewat namun status buka
    const expiredAlert = document.getElementById("spmbExpiredAlert");
    const today = new Date().toISOString().split("T")[0];
    if (config.spmbStatus === "buka" && config.spmbSelesai && today > config.spmbSelesai) {
      expiredAlert.style.display = "block";
    } else {
      expiredAlert.style.display = "none";
    }

    // Tabel pendaftar terbaru di dasbor (maks 5)
    const tbody = document.getElementById("dashTablePendaftar");
    const latest = pendaftar.slice(0, 5);
    if (latest.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Belum ada formulir masuk.</td></tr>`;
    } else {
      tbody.innerHTML = latest
        .map(
          (p) => `
        <tr>
          <td><strong>${p.nomorPendaftaran}</strong></td>
          <td>${escapeHtml(p.namaMurid)}</td>
          <td>${p.waktuDaftar || "-"}</td>
          <td>${escapeHtml(p.hp)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="AppPendaftar.viewDetail('${p.nomorPendaftaran}')">Periksa</button></td>
        </tr>
      `
        )
        .join("");
    }
  }

  // ==========================================
  // 5. PENYIMPANAN FORMULIR (IDENTITAS, DLL)
  // ==========================================
  function initForms() {
    setupGenericForm("formIdentitas", "barIdentitas", "Identitas Sekolah");
    setupGenericForm("formBeranda", "barBeranda", "Halaman Beranda");
    setupGenericForm("formProfil", "barProfil", "Profil Sekolah");
    setupGenericForm("formSpmbConfig", "barSpmb", "Pengaturan SPMB");
  }

  function setupGenericForm(formId, barId, modulTitle) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type='submit']");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Menyimpan ke Database...";

      const formData = new FormData(form);
      const items = [];
      for (let [key, val] of formData.entries()) {
        items.push({ kunci: key, nilai: val });
      }

      try {
        await apiCall("admin_saveKonten", { items: items });
        // Simpan langsung ke cache lokal browser agar website seketika ter-update dalam 0 milidetik
        try {
          const currentConfig = JSON.parse(localStorage.getItem("sdn_site_config") || "{}");
          items.forEach((it) => {
            currentConfig[it.kunci] = it.nilai;
            if (AppState.siteConfig) AppState.siteConfig[it.kunci] = it.nilai;
          });
          localStorage.setItem("sdn_site_config", JSON.stringify(currentConfig));
        } catch (e) {}

        showToast(`${modulTitle} berhasil disimpan dan langsung diperbarui di web!`, "success");
      } catch (err) {
        showToast(`Gagal menyimpan ${modulTitle}: ` + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  }

  // ==========================================
  // 6. MODUL PENDAFTAR SPMB
  // ==========================================
  const AppPendaftar = {
    viewDetail: function (nomor) {
      const p = AppState.pendaftarList.find((item) => item.nomorPendaftaran === nomor);
      if (!p) return;

      document.getElementById("mPendaftarNomor").textContent = `Pendaftaran: ${p.nomorPendaftaran}`;
      const body = document.getElementById("mPendaftarBody");

      body.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div><span style="color: var(--text-muted);">Nama Calon Murid:</span><br><strong>${escapeHtml(p.namaMurid)}</strong></div>
          <div><span style="color: var(--text-muted);">NIK Murid (16 Digit):</span><br><code>${escapeHtml(p.nik)}</code></div>
          <div><span style="color: var(--text-muted);">Tempat, Tgl Lahir:</span><br>${escapeHtml(p.tempatLahir)}, ${p.tanggalLahir}</div>
          <div><span style="color: var(--text-muted);">Jenis Kelamin:</span><br>${escapeHtml(p.jenisKelamin)}</div>
          <div><span style="color: var(--text-muted);">Nama Orang Tua/Wali:</span><br><strong>${escapeHtml(p.namaOrtu)}</strong></div>
          <div><span style="color: var(--text-muted);">No. WhatsApp / HP:</span><br><a href="https://wa.me/${String(p.hp).replace(/\D/g, '')}" target="_blank">${escapeHtml(p.hp)} 💬</a></div>
          <div style="grid-column: 1/-1;"><span style="color: var(--text-muted);">Alamat Sesuai KK:</span><br>${escapeHtml(p.alamat)}</div>
          <div><span style="color: var(--text-muted);">Asal TK/PAUD:</span><br>${escapeHtml(p.asalTk || '-')}</div>
          <div><span style="color: var(--text-muted);">Waktu Masuk:</span><br>${p.waktuDaftar}</div>
        </div>

        <div style="background: var(--bg-app); padding: 1rem; border-radius: var(--radius); margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem;">Berkas Persyaratan Asli (Google Drive):</h4>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            ${p.linkKk ? `<a href="${p.linkKk}" target="_blank" class="btn btn-outline btn-sm">📄 Buka Berkas Kartu Keluarga</a>` : `<span style="color: var(--danger); font-size: 0.85rem;">Berkas KK Tidak Ada</span>`}
            ${p.linkAkta ? `<a href="${p.linkAkta}" target="_blank" class="btn btn-outline btn-sm">📜 Buka Berkas Akta Kelahiran</a>` : `<span style="color: var(--danger); font-size: 0.85rem;">Berkas Akta Tidak Ada</span>`}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ubah Status Verifikasi:</label>
          <select id="modalStatusSelect" class="form-control">
            <option value="baru" ${p.status === 'baru' ? 'selected' : ''}>Baru (Belum Diverifikasi)</option>
            <option value="diproses" ${p.status === 'diproses' ? 'selected' : ''}>Diproses (Sedang Ditinjau)</option>
            <option value="diterima" ${p.status === 'diterima' ? 'selected' : ''}>Diterima (Lulus Verifikasi)</option>
            <option value="ditolak" ${p.status === 'ditolak' ? 'selected' : ''}>Ditolak (Tidak Memenuhi Syarat)</option>
            <option value="dibatalkan" ${p.status === 'dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Catatan Admin / Verifikator:</label>
          <textarea id="modalCatatanAdmin" rows="2" class="form-control" placeholder="Tuliskan catatan hasil verifikasi berkas...">${escapeHtml(p.catatanAdmin || '')}</textarea>
        </div>
      `;

      document.getElementById("modalDetailPendaftar").classList.add("active");

      document.getElementById("btnSimpanStatusPendaftar").onclick = async () => {
        const newStatus = document.getElementById("modalStatusSelect").value;
        const newCatatan = document.getElementById("modalCatatanAdmin").value.trim();

        try {
          await apiCall("admin_updatePendaftar", {
            nomorPendaftaran: p.nomorPendaftaran,
            status: newStatus,
            catatanAdmin: newCatatan
          });

          p.status = newStatus;
          p.catatanAdmin = newCatatan;
          showToast(`Status pendaftaran ${p.nomorPendaftaran} berhasil diubah!`, "success");
          AppPendaftar.closeModal();
          loadPendaftarTable();
        } catch (e) {
          showToast("Gagal memperbarui status: " + e.message, "error");
        }
      };
    },

    closeModal: function () {
      document.getElementById("modalDetailPendaftar").classList.remove("active");
    }
  };
  window.AppPendaftar = AppPendaftar;

  function initPendaftarEvents() {
    document.getElementById("filterStatusPendaftar").addEventListener("change", loadPendaftarTable);
    document.getElementById("searchPendaftar").addEventListener("input", loadPendaftarTable);
    document.getElementById("btnRefreshPendaftar").addEventListener("click", async () => {
      showToast("Memuat ulang data pendaftar...");
      await loadAllData();
      loadPendaftarTable();
    });

    document.getElementById("btnExportCsv").addEventListener("click", exportPendaftarCsv);
  }

  function loadPendaftarTable() {
    const tbody = document.getElementById("tablePendaftarBody");
    const filterStatus = document.getElementById("filterStatusPendaftar").value;
    const query = document.getElementById("searchPendaftar").value.toLowerCase().trim();

    let list = AppState.pendaftarList;
    if (filterStatus) {
      list = list.filter((p) => p.status === filterStatus);
    }
    if (query) {
      list = list.filter((p) => (p.namaMurid && p.namaMurid.toLowerCase().includes(query)) || (p.nomorPendaftaran && p.nomorPendaftaran.toLowerCase().includes(query)));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Tidak ada pendaftar yang sesuai.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (p) => `
      <tr>
        <td><code>${p.nomorPendaftaran}</code></td>
        <td><strong>${escapeHtml(p.namaMurid)}</strong></td>
        <td>${p.waktuDaftar || '-'}</td>
        <td>${escapeHtml(p.namaOrtu)}</td>
        <td>${escapeHtml(p.hp)}</td>
        <td><span class="badge badge-${p.status || 'baru'}">${p.status || 'baru'}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="AppPendaftar.viewDetail('${p.nomorPendaftaran}')">Detail & Verifikasi</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  function exportPendaftarCsv() {
    if (AppState.pendaftarList.length === 0) {
      showToast("Belum ada data pendaftar untuk diekspor.", "error");
      return;
    }

    const headers = ["No. Pendaftaran", "Waktu Daftar", "Nama Murid", "NIK", "Tempat Lahir", "Tgl Lahir", "Jenis Kelamin", "Nama Ortu", "No. HP", "Alamat", "Asal TK", "Status", "Catatan Admin"];
    const rows = AppState.pendaftarList.map((p) => [
      `"${p.nomorPendaftaran}"`,
      `"${p.waktuDaftar}"`,
      `"${p.namaMurid}"`,
      `"'${p.nik}"`,
      `"${p.tempatLahir}"`,
      `"${p.tanggalLahir}"`,
      `"${p.jenisKelamin}"`,
      `"${p.namaOrtu}"`,
      `"'${p.hp}"`,
      `"${p.alamat}"`,
      `"${p.asalTk || ''}"`,
      `"${p.status}"`,
      `"${p.catatanAdmin || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pendaftar_SPMB_SDN_Sumberejo_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==========================================
  // 7. PUSTAKA MEDIA & KOMPRESI UNGGAH
  // ==========================================
  function initMediaUpload() {
    const fileInput = document.getElementById("inputUploadMediaFile");
    const progress = document.getElementById("mediaUploadProgressBar");
    const progressText = document.getElementById("mediaUploadProgressText");

    fileInput.addEventListener("change", async () => {
      if (!fileInput.files || !fileInput.files[0]) return;
      const file = fileInput.files[0];

      // Batas maksimal upload foto 50 MB
      if (file.size > 50 * 1024 * 1024) {
        showToast(`Ukuran berkas foto (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 50 MB.`, "error");
        fileInput.value = "";
        return;
      }

      progress.style.display = "block";
      progressText.textContent = `Mengompresi ${file.name} di browser...`;

      try {
        // Kompresi di sisi browser via ImageProcessor (Maks 50 MB)
        const processed = await ImageProcessor.compress(file);
        progressText.textContent = `Mengunggah ${processed.name} (${processed.sizeFormatted}) ke Google Drive...`;

        const result = await apiCall("admin_uploadMedia", {
          berkas: {
            nama: processed.name,
            mime: processed.mime,
            base64: processed.base64
          },
          alt: file.name
        });

        showToast("Foto berhasil dikompresi dan diunggah ke Google Drive!", "success");
        loadMediaLibrary();
      } catch (err) {
        showToast("Gagal mengunggah foto: " + err.message, "error");
      } finally {
        progress.style.display = "none";
        fileInput.value = "";
      }
    });
  }

  async function loadMediaLibrary() {
    const grid = document.getElementById("mediaLibraryGrid");
    try {
      const list = await apiCall("admin_listMedia");
      AppState.mediaList = list || [];

      if (AppState.mediaList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada foto yang diunggah. Klik tombol '+ Unggah Foto Baru' di atas.</div>`;
        return;
      }

      grid.innerHTML = AppState.mediaList
        .map(
          (m) => {
            const mediaSrc = formatPhotoUrl(m.url);
            const driveId = extractDriveId(m.url);
            return `
        <div class="media-item" onclick="navigator.clipboard.writeText('${escapeHtml(m.url)}'); showToast('URL Foto berhasil disalin!')">
          <img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(m.alt || m.namaAsli)}" class="media-thumb" loading="lazy" referrerpolicy="no-referrer" onerror="window.handleAdminImgError(this, '${driveId || ''}')">
          <div class="media-meta" title="${escapeHtml(m.namaAsli)}">${escapeHtml(m.namaAsli)}</div>
        </div>
      `;
          }
        )
        .join("");
    } catch (e) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 2rem;">Gagal memuat pustaka media.</div>`;
    }
  }

  // ==========================================
  // 8. MANAJEMEN KOLEKSI (CRUD LENGKAP & MEDIA UPLOAD FOTO/VIDEO)
  // ==========================================
  async function loadCollection(sheetName) {
    const tableIds = {
      Pengumuman: "tablePengumumanBody",
      Guru: "tableGuruBody",
      Ekstrakurikuler: "tableEkskulBody",
      Fasilitas: "tableFasilitasBody",
      Galeri: "tableGaleriBody"
    };

    const tbody = document.getElementById(tableIds[sheetName]);
    if (!tbody) return;

    // 1. Tampilkan seketika (0 ms) jika sudah ada di memori dari admin_getBundle
    if (Array.isArray(AppState.collections[sheetName]) && AppState.collections[sheetName].length > 0) {
      renderCollectionTable(sheetName, AppState.collections[sheetName]);
    } else {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Memuat data ${sheetName}...</td></tr>`;
    }

    // 2. Segarkan dari endpoint cepat (/api/gas -> Google Apps Script)
    try {
      const items = await apiCall("admin_getCollection", { sheetName: sheetName });
      AppState.collections[sheetName] = items || [];
      renderCollectionTable(sheetName, AppState.collections[sheetName]);
    } catch (err) {
      if (!Array.isArray(AppState.collections[sheetName]) || AppState.collections[sheetName].length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger); padding: 1.5rem;">Gagal memuat: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function renderCollectionTable(sheetName, items) {
    // Sinkronkan ke cache browser agar website publik langsung membaca data ini dalam 0 ms
    const keyMap = {
      Pengumuman: "sdn_pengumuman_list",
      Guru: "sdn_guru_list",
      Ekstrakurikuler: "sdn_ekskul_list",
      Fasilitas: "sdn_fasilitas_list",
      Galeri: "sdn_galeri_list"
    };
    if (keyMap[sheetName]) {
      const publicItems = (items || []).filter((x) => x.tampil === true || String(x.tampil).toUpperCase() === "TRUE");
      if (sheetName === "Pengumuman") {
        publicItems.forEach((it) => {
          if (!it.fotoUrl) {
            try {
              const cachedP = localStorage.getItem("sdn_photo_" + it.id);
              if (cachedP) it.fotoUrl = cachedP;
            } catch (e) {}
          }
        });
      }
      try {
        localStorage.setItem(keyMap[sheetName], JSON.stringify(publicItems));
      } catch (storageErr) {
        // Jika localStorage penuh karena sisa data lama, bersihkan item foto lama dan simpan ulang
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("sdn_photo_")) localStorage.removeItem(k);
          });
          localStorage.setItem(keyMap[sheetName], JSON.stringify(publicItems));
        } catch (e) {}
      }
      if (sheetName === "Pengumuman") {
        const pengumumanEl = document.getElementById("statPengumumanTayang");
        if (pengumumanEl) pengumumanEl.textContent = publicItems.length;
      }
    }

    const tableIds = {
      Pengumuman: "tablePengumumanBody",
      Guru: "tableGuruBody",
      Ekstrakurikuler: "tableEkskulBody",
      Fasilitas: "tableFasilitasBody",
      Galeri: "tableGaleriBody"
    };

    const tbody = document.getElementById(tableIds[sheetName]);
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data ${sheetName}. Silakan klik tombol '+ Tambah' di atas.</td></tr>`;
      return;
    }

    if (sheetName === "Pengumuman") {
      tbody.innerHTML = items
        .map(
          (it) => {
            const rawPhoto = it.fotoUrl || it.bannerUrl || it.foto || it.gambar || it.thumbnail || "";
            const displayPhoto = rawPhoto ? formatPhotoUrl(rawPhoto) : "";
            const driveId = extractDriveId(rawPhoto);
            const isiStr = it.isi !== undefined && it.isi !== null ? String(it.isi) : "";
            return `
        <tr>
          <td>
            ${displayPhoto ? `<img src="${escapeHtml(displayPhoto)}" alt="${escapeHtml(it.judul)}" referrerpolicy="no-referrer" style="width: 62px; height: 42px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); display: block;" onerror="window.handleAdminImgError(this, '${driveId || ''}')">` : `<div style="width: 62px; height: 42px; border-radius: 6px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📢</div>`}
          </td>
          <td><strong>${escapeHtml(it.judul)}</strong><br><small style="color: var(--text-muted);">${escapeHtml(isiStr ? isiStr.substring(0, 60) + (isiStr.length > 60 ? '...' : '') : '')}</small></td>
          <td>${it.tanggal || "-"}</td>
          <td>${renderStatusToggle(sheetName, it.id, it.tampil)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('${sheetName}', '${escapeHtml(it.id)}')">✏️ Edit</button>
              <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="AppCollections.deleteItem('${sheetName}', '${escapeHtml(it.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join("");
    } else if (sheetName === "Guru") {
      tbody.innerHTML = items
        .map(
          (it) => {
            const displayPhoto = it.fotoUrl ? formatPhotoUrl(it.fotoUrl) : "";
            const driveId = extractDriveId(it.fotoUrl);
            return `
        <tr>
          <td><strong>${it.urutan || 99}</strong></td>
          <td>
            ${displayPhoto ? `<img src="${escapeHtml(displayPhoto)}" alt="${escapeHtml(it.nama)}" referrerpolicy="no-referrer" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); display: block;" onerror="window.handleAdminImgError(this, '${driveId || ''}')">` : `<div style="width: 44px; height: 44px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">👨‍🏫</div>`}
          </td>
          <td><strong>${escapeHtml(it.nama)}</strong></td>
          <td>${escapeHtml(it.jabatan)}</td>
          <td>${renderStatusToggle(sheetName, it.id, it.tampil)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('${sheetName}', '${escapeHtml(it.id)}')">✏️ Edit</button>
              <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="AppCollections.deleteItem('${sheetName}', '${escapeHtml(it.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join("");
    } else if (sheetName === "Ekstrakurikuler") {
      tbody.innerHTML = items
        .map(
          (it) => {
            const displayPhoto = it.fotoUrl ? formatPhotoUrl(it.fotoUrl) : "";
            const driveId = extractDriveId(it.fotoUrl);
            return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              ${displayPhoto ? `<img src="${escapeHtml(displayPhoto)}" alt="${escapeHtml(it.nama)}" referrerpolicy="no-referrer" style="width: 52px; height: 38px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;" onerror="window.handleAdminImgError(this, '${driveId || ''}')">` : `<div style="width: 52px; height: 38px; border-radius: 6px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">🎯</div>`}
              <div>
                <strong>${escapeHtml(it.nama)}</strong>
              </div>
            </div>
          </td>
          <td>${escapeHtml(it.pembina || "-")}</td>
          <td>${escapeHtml(it.jadwal || "-")}</td>
          <td>${renderStatusToggle(sheetName, it.id, it.tampil)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('${sheetName}', '${escapeHtml(it.id)}')">✏️ Edit</button>
              <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="AppCollections.deleteItem('${sheetName}', '${escapeHtml(it.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join("");
    } else if (sheetName === "Fasilitas") {
      tbody.innerHTML = items
        .map(
          (it) => {
            const descStr = it.deskripsi !== undefined && it.deskripsi !== null ? String(it.deskripsi) : "";
            const displayPhoto = it.fotoUrl ? formatPhotoUrl(it.fotoUrl) : "";
            const driveId = extractDriveId(it.fotoUrl);
            return `
        <tr>
          <td><strong>${it.urutan || 99}</strong></td>
          <td>
            ${displayPhoto ? `<img src="${escapeHtml(displayPhoto)}" alt="${escapeHtml(it.nama)}" referrerpolicy="no-referrer" style="width: 54px; height: 38px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border); display: block;" onerror="window.handleAdminImgError(this, '${driveId || ''}')">` : `<div style="width: 54px; height: 38px; border-radius: 4px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 1rem;">🏢</div>`}
          </td>
          <td><strong>${escapeHtml(it.nama)}</strong></td>
          <td><small style="color: var(--text-muted);">${escapeHtml(descStr ? descStr.substring(0, 50) + (descStr.length > 50 ? '...' : '') : '')}</small></td>
          <td>${renderStatusToggle(sheetName, it.id, it.tampil)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('${sheetName}', '${escapeHtml(it.id)}')">✏️ Edit</button>
              <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="AppCollections.deleteItem('${sheetName}', '${escapeHtml(it.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join("");
    } else if (sheetName === "Galeri") {
      tbody.innerHTML = items
        .map(
          (it) => {
            const displayUrl = it.url ? formatPhotoUrl(it.url) : "";
            const driveId = extractDriveId(it.url);
            return `
        <tr>
          <td>${it.tanggal || "-"}</td>
          <td><strong>${escapeHtml(it.judul)}</strong></td>
          <td>
            <span class="badge ${it.tipe === 'video' ? 'badge-diproses' : 'badge-diterima'}">
              ${it.tipe === 'video' ? '🎥 Video' : '📷 Foto'}
            </span>
          </td>
          <td>
            ${
              it.url
                ? it.tipe === "video"
                  ? `<a href="${escapeHtml(displayUrl)}" target="_blank" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.78rem;">Buka Video ↗</a>`
                  : `<div style="display: flex; align-items: center; gap: 0.5rem;">
                       <img src="${escapeHtml(displayUrl)}" alt="${escapeHtml(it.judul)}" referrerpolicy="no-referrer" style="width: 54px; height: 38px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border);" onerror="window.handleAdminImgError(this, '${driveId || ''}')">
                       <a href="${escapeHtml(displayUrl)}" target="_blank" class="btn btn-outline btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;">Buka ↗</a>
                     </div>`
                : '<span style="color: var(--text-muted);">-</span>'
            }
          </td>
          <td>${renderStatusToggle(sheetName, it.id, it.tampil)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('${sheetName}', '${escapeHtml(it.id)}')">✏️ Edit</button>
              <button type="button" class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="AppCollections.deleteItem('${sheetName}', '${escapeHtml(it.id)}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
          }
        )
        .join("");
    }
  }

  function renderStatusToggle(sheetName, id, status) {
    const isTampil = status === true || String(status).toUpperCase() === "TRUE";
    return `
      <button type="button" class="btn btn-sm ${isTampil ? 'btn-outline' : 'btn-outline'}" 
              style="padding: 0.2rem 0.5rem; font-size: 0.78rem; border-color: ${isTampil ? 'var(--success)' : 'var(--border)'}; color: ${isTampil ? 'var(--success)' : 'var(--text-muted)'};"
              onclick="AppCollections.toggleStatus('${sheetName}', '${id}', ${isTampil})">
        ${isTampil ? '👁️ Tayang' : '🔒 Sembunyi'}
      </button>
    `;
  }

  // Objek Global Manajemen Koleksi
  const AppCollections = {
    openModal: function (sheetName, itemOrId = null) {
      let item = itemOrId;
      if (typeof itemOrId === "string" && itemOrId !== "") {
        const list =
          sheetName === "PenggunaAdmin"
            ? AppState.usersList || []
            : AppState.collections[sheetName] || [];
        item = list.find((x) => String(x.id) === String(itemOrId)) || null;
      }
      AppState.currentModalSheet = sheetName;
      AppState.currentEditItem = item;

      const titleEl = document.getElementById("mCollectionTitle");
      const bodyEl = document.getElementById("mCollectionBody");
      const formEl = document.getElementById("formCollectionItem");

      titleEl.textContent = (item ? "Ubah Data " : "Tambah Data ") + (sheetName === "PenggunaAdmin" ? "Pengguna Admin" : sheetName);

      // Reset form
      formEl.reset();

      // Bangun elemen input sesuai modul
      let fieldsHtml = `<input type="hidden" name="id" value="${item ? item.id : ''}">`;

      if (sheetName === "Pengumuman") {
        const currentPhoto = item ? (item.fotoUrl || item.bannerUrl || item.foto || item.gambar || item.thumbnail || item.url || "") : "";
        const currentCat = item ? (item.kategori || "Kegiatan Sekolah") : "Kegiatan Sekolah";
        fieldsHtml += `
          <div class="form-group">
            <label class="form-label">Judul Pengumuman *</label>
            <input type="text" name="judul" class="form-control" value="${escapeHtml(item ? item.judul : '')}" required placeholder="Contoh: Jadwal Libur Semester">
          </div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Tanggal Pengumuman *</label>
              <input type="date" name="tanggal" class="form-control" value="${item ? item.tanggal : new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kategori Pengumuman</label>
              <select name="kategori" class="form-control">
                <option value="Kegiatan Sekolah" ${currentCat === 'Kegiatan Sekolah' ? 'selected' : ''}>📢 Kegiatan Sekolah</option>
                <option value="Akademik" ${currentCat === 'Akademik' ? 'selected' : ''}>📖 Akademik</option>
                <option value="Orang Tua" ${currentCat === 'Orang Tua' ? 'selected' : ''}>👥 Orang Tua</option>
                <option value="Informasi Sekolah" ${currentCat === 'Informasi Sekolah' ? 'selected' : ''}>ℹ️ Informasi Sekolah</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Isi Lengkap Pengumuman *</label>
            <textarea name="isi" rows="4" class="form-control" required placeholder="Tuliskan isi pengumuman secara rinci...">${escapeHtml(item ? item.isi : '')}</textarea>
          </div>
          ${renderPhotoUploadControl("fotoUrl", currentPhoto, "Foto Thumbnail Pengumuman (Maks. 50 MB)")}
        `;
      } else if (sheetName === "Guru") {
        fieldsHtml += `
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Nama Lengkap & Gelar *</label>
              <input type="text" name="nama" class="form-control" value="${escapeHtml(item ? item.nama : '')}" required placeholder="Contoh: Ahmad Fauzi, S.Pd.">
            </div>
            <div class="form-group">
              <label class="form-label">Nomor Urutan Tampil</label>
              <input type="number" name="urutan" class="form-control" value="${item ? item.urutan || 1 : 1}" min="1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Jabatan / Tugas Mengajar *</label>
            <input type="text" name="jabatan" class="form-control" value="${escapeHtml(item ? item.jabatan : '')}" required placeholder="Contoh: Guru Kelas 5 / Pembina Pramuka">
          </div>
          ${renderPhotoUploadControl("fotoUrl", item ? item.fotoUrl : "", "Foto Resmi Guru (Langsung dari HP/Laptop)")}
        `;
      } else if (sheetName === "Ekstrakurikuler") {
        fieldsHtml += `
          <div class="form-group">
            <label class="form-label">Nama Kegiatan Ekstrakurikuler *</label>
            <input type="text" name="nama" class="form-control" value="${escapeHtml(item ? item.nama : '')}" required placeholder="Contoh: Pramuka Siaga">
          </div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Guru Pembina / Pelatih</label>
              <input type="text" name="pembina" class="form-control" value="${escapeHtml(item ? item.pembina : '')}" placeholder="Contoh: Bapak Rudi, S.Pd.">
            </div>
            <div class="form-group">
              <label class="form-label">Jadwal Latihan</label>
              <input type="text" name="jadwal" class="form-control" value="${escapeHtml(item ? item.jadwal : '')}" placeholder="Contoh: Setiap Jumat, 14:00 - 16:00">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi Kegiatan *</label>
            <textarea name="deskripsi" rows="3" class="form-control" required placeholder="Jelaskan tujuan dan aktivitas kegiatan...">${escapeHtml(item ? item.deskripsi : '')}</textarea>
          </div>
          ${renderPhotoUploadControl("fotoUrl", item ? item.fotoUrl : "", "Foto Kegiatan Ekstrakurikuler")}
        `;
      } else if (sheetName === "Fasilitas") {
        fieldsHtml += `
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Nama Sarana / Fasilitas *</label>
              <input type="text" name="nama" class="form-control" value="${escapeHtml(item ? item.nama : '')}" required placeholder="Contoh: Laboratorium Komputer">
            </div>
            <div class="form-group">
              <label class="form-label">Nomor Urutan</label>
              <input type="number" name="urutan" class="form-control" value="${item ? item.urutan || 1 : 1}" min="1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Deskripsi Sarana *</label>
            <textarea name="deskripsi" rows="3" class="form-control" required placeholder="Jelaskan sarana dan fungsinya...">${escapeHtml(item ? item.deskripsi : '')}</textarea>
          </div>
          ${renderPhotoUploadControl("fotoUrl", item ? item.fotoUrl : "", "Foto Fasilitas Sekolah")}
        `;
      } else if (sheetName === "Galeri") {
        fieldsHtml += `
          <div class="form-group">
            <label class="form-label">Judul Dokumentasi Kegiatan *</label>
            <input type="text" name="judul" class="form-control" value="${escapeHtml(item ? item.judul : '')}" required placeholder="Contoh: Upacara Hari Kemerdekaan RI">
          </div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Tanggal Kegiatan *</label>
              <input type="date" name="tanggal" class="form-control" value="${item ? item.tanggal : new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Tipe Media *</label>
              <select name="tipe" id="selectGaleriTipe" class="form-control" onchange="AppCollections.handleGaleriTipeChange(this.value)">
                <option value="foto" ${!item || item.tipe === 'foto' ? 'selected' : ''}>📷 Foto / Gambar</option>
                <option value="video" ${item && item.tipe === 'video' ? 'selected' : ''}>🎥 Video Dokumentasi</option>
              </select>
            </div>
          </div>

          <!-- Wadah Kontrol Foto -->
          <div id="galeriPhotoSection" style="display: ${!item || item.tipe === 'foto' ? 'block' : 'none'};">
            ${renderPhotoUploadControl("url_foto", item && item.tipe === 'foto' ? item.url : "", "Pilih Foto Kegiatan (Otomatis Kompresi)")}
          </div>

          <!-- Wadah Kontrol Video -->
          <div id="galeriVideoSection" style="display: ${item && item.tipe === 'video' ? 'block' : 'none'};">
            <div class="form-group">
              <label class="form-label">Tautan Video YouTube / Google Drive</label>
              <input type="url" name="url_video" id="inputVideoUrl" class="form-control" value="${item && item.tipe === 'video' ? escapeHtml(item.url) : ''}" placeholder="Contoh: https://www.youtube.com/watch?v=... atau link Drive">
              <small style="color: var(--text-muted); display: block; margin-top: 0.35rem;">
                💡 Masukkan tautan YouTube atau unggah file video MP4 di bawah ini.
              </small>
            </div>

            <div class="form-group">
              <label class="form-label">Atau Unggah Berkas Video (MP4) Langsung</label>
              <input type="file" id="inputUploadVideoFile" accept="video/mp4,video/webm" class="form-control">
              <div id="videoUploadProgress" style="display: none; margin-top: 0.5rem; font-size: 0.85rem; color: var(--primary);">
                ⏳ Mengunggah video ke Google Drive...
              </div>
            </div>
          </div>
        `;
      } else if (sheetName === "PenggunaAdmin") {
        const currentRole = item ? item.peran || "editor" : "editor";
        const isUserActive = item ? Boolean(item.aktif) : true;
        fieldsHtml += `
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Nama Pengguna (Username) *</label>
              <input type="text" name="namaPengguna" class="form-control" value="${escapeHtml(item ? item.namaPengguna : '')}" required placeholder="Contoh: guru_ipa">
            </div>
            <div class="form-group">
              <label class="form-label">Nama Tampilan Lengkap *</label>
              <input type="text" name="namaTampil" class="form-control" value="${escapeHtml(item ? item.namaTampil : '')}" required placeholder="Contoh: Ibu Rina, S.Pd.">
            </div>
          </div>
          <div class="form-row two-col">
            <div class="form-group">
              <label class="form-label">Peran Akses *</label>
              <select name="peran" class="form-control">
                <option value="superadmin" ${currentRole === 'superadmin' ? 'selected' : ''}>Superadmin (Akses Penuh)</option>
                <option value="editor" ${currentRole === 'editor' ? 'selected' : ''}>Editor Konten</option>
                <option value="admin_spmb" ${currentRole === 'admin_spmb' ? 'selected' : ''}>Admin SPMB</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kata Sandi ${item ? '(Kosongkan jika tetap)' : '*'}</label>
              <input type="password" name="kataSandi" class="form-control" ${item ? '' : 'required'} placeholder="Minimal 6 karakter">
            </div>
          </div>
          <div class="form-group" style="margin-top: 0.75rem;">
            <label class="form-label">Email Google / Akun Firebase (Opsional)</label>
            <input type="email" name="email" class="form-control" value="${escapeHtml(item ? item.email || '' : '')}" placeholder="contoh: nama@gmail.com">
            <small style="color: var(--text-muted); display: block; margin-top: 0.25rem;">
              🔥 Jika diisi, pengguna dapat langsung login menggunakan tombol <strong>Masuk dengan Akun Google</strong>.
            </small>
          </div>
          <div class="form-group" style="margin-top: 0.75rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" name="aktif" value="true" ${isUserActive ? 'checked' : ''} style="width: 18px; height: 18px;">
              <span style="font-weight: 600;">Akun Aktif (Dapat Masuk ke Panel CMS)</span>
            </label>
          </div>
        `;
      }

      // Checkbox Status Tampil (untuk koleksi konten publik)
      if (sheetName !== "PenggunaAdmin") {
        const isChecked = item ? (item.tampil === true || String(item.tampil).toUpperCase() === "TRUE") : true;
        fieldsHtml += `
          <div class="form-group" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" name="tampil" value="true" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px;">
              <span style="font-weight: 600;">Tayangkan di Website Publik</span>
            </label>
          </div>
        `;
      }

      bodyEl.innerHTML = fieldsHtml;

      // Inisialisasi event upload foto lokal di dalam modal
      initModalUploadEvents();

      document.getElementById("modalCollection").classList.add("active");
    },

    closeModal: function () {
      document.getElementById("modalCollection").classList.remove("active");
    },

    handleGaleriTipeChange: function (tipe) {
      const pSec = document.getElementById("galeriPhotoSection");
      const vSec = document.getElementById("galeriVideoSection");
      if (pSec) pSec.style.display = tipe === "foto" ? "block" : "none";
      if (vSec) vSec.style.display = tipe === "video" ? "block" : "none";
    },

    deleteItem: async function (sheetName, id) {
      const prevList = [...(AppState.collections[sheetName] || [])];
      AppState.collections[sheetName] = prevList.filter((x) => String(x.id) !== String(id));
      renderCollectionTable(sheetName, AppState.collections[sheetName]);
      try {
        await apiCall("admin_deleteRow", { sheetName, id });
        showToast(`Data ${sheetName} berhasil dihapus secara realtime!`, "success");
      } catch (e) {
        AppState.collections[sheetName] = prevList;
        renderCollectionTable(sheetName, prevList);
        showToast("Gagal menghapus: " + e.message, "error");
      }
    },

    toggleStatus: async function (sheetName, id, currentTampil) {
      const list = AppState.collections[sheetName] || [];
      const target = list.find((x) => String(x.id) === String(id));
      if (target) {
        target.tampil = !currentTampil;
        renderCollectionTable(sheetName, list);
      }
      try {
        await apiCall("admin_toggleRow", { sheetName, id, tampil: !currentTampil });
        showToast(`Status tayang ${sheetName} diperbarui secara realtime!`, "success");
      } catch (e) {
        if (target) {
          target.tampil = currentTampil;
          renderCollectionTable(sheetName, list);
        }
        showToast("Gagal memperbarui status: " + e.message, "error");
      }
    }
  };
  window.AppCollections = AppCollections;

  function renderPhotoUploadControl(fieldName, currentVal, label) {
    const previewUrl = currentVal ? formatPhotoUrl(currentVal) : "";
    const driveId = extractDriveId(currentVal);
    return `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <img id="previewColImg_${fieldName}" src="${escapeHtml(previewUrl)}" 
               referrerpolicy="no-referrer"
               style="width: 96px; height: 68px; border-radius: var(--radius); object-fit: cover; background: #e2e8f0; border: 1px solid var(--border); display: ${previewUrl ? 'block' : 'none'};"
               onerror="window.handleAdminImgError(this, '${driveId || ''}')">
          <div style="flex: 1; min-width: 200px;">
            <input type="file" id="fileColInput_${fieldName}" accept="image/*" class="form-control" style="font-size: 0.85rem;">
            <small style="display: block; color: var(--text-muted); margin-top: 0.25rem;">
              📷 Format: JPG, PNG, WEBP (Otomatis dikompresi, batas maksimal <strong>50 MB</strong>)
            </small>
            <div id="colUploadProgress_${fieldName}" style="display: none; font-size: 0.8rem; color: var(--primary); margin-top: 0.35rem;">
              ⏳ Mengompresi dan mengunggah foto...
            </div>
          </div>
        </div>
        <input type="hidden" name="${fieldName}" id="valColInput_${fieldName}" value="${escapeHtml(currentVal || '')}">
      </div>
    `;
  }

  function initModalUploadEvents() {
    // Tangani input file gambar di dalam modal
    const fileInputs = document.querySelectorAll("[id^='fileColInput_']");
    fileInputs.forEach((input) => {
      input.addEventListener("change", async () => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        // Validasi batas 50 MB
        if (file.size > 50 * 1024 * 1024) {
          showToast(`Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas 50 MB.`, "error");
          input.value = "";
          return;
        }

        const fieldName = input.id.replace("fileColInput_", "");
        const preview = document.getElementById("previewColImg_" + fieldName);
        const progress = document.getElementById("colUploadProgress_" + fieldName);
        const hiddenVal = document.getElementById("valColInput_" + fieldName);
        const submitBtn = document.getElementById("btnSubmitCollection");

        // Tampilkan pratinjau instan (0 ms) begitu foto dipilih
        const localPreviewUrl = URL.createObjectURL(file);
        if (preview) {
          preview.onerror = null;
          preview.src = localPreviewUrl;
          preview.style.display = "block";
        }

        if (progress) {
          progress.textContent = `⏳ Mengompresi foto (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`;
          progress.style.display = "block";
        }
        if (submitBtn) submitBtn.disabled = true;

        try {
          // Kompresi di browser (Mendukung hingga 50 MB)
          const compressed = await ImageProcessor.compress(file);
          if (progress) progress.textContent = `⏳ Mengunggah ${compressed.name} (${compressed.sizeFormatted})...`;

          const res = await apiCall("admin_uploadMedia", {
            berkas: {
              nama: compressed.name,
              mime: compressed.mime,
              base64: compressed.base64
            },
            alt: file.name
          });

          hiddenVal.value = res.url;
          if (preview) {
            const formatted = formatPhotoUrl(res.url);
            const dId = extractDriveId(res.url);
            preview.onerror = function () {
              window.handleAdminImgError(this, dId || "");
            };
            preview.src = formatted;
            preview.style.display = "block";
          }
          showToast(`Foto berhasil dikompresi (${compressed.sizeFormatted}) dan siap disimpan!`, "success");
        } catch (err) {
          showToast("Gagal mengunggah foto: " + err.message, "error");
        } finally {
          if (progress) progress.style.display = "none";
          if (submitBtn) submitBtn.disabled = false;
          setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 10000);
        }
      });
    });

    // Tangani input upload berkas video (MP4) jika ada
    const videoInput = document.getElementById("inputUploadVideoFile");
    if (videoInput) {
      videoInput.addEventListener("change", async () => {
        if (!videoInput.files || !videoInput.files[0]) return;
        const file = videoInput.files[0];

        // Validasi ukuran video maksimal 10 MB untuk batas Google Apps Script
        if (file.size > 10 * 1024 * 1024) {
          showToast("Ukuran berkas video melebihi 10 MB. Disarankan memakai tautan video YouTube.", "error");
          videoInput.value = "";
          return;
        }

        const vProgress = document.getElementById("videoUploadProgress");
        if (vProgress) vProgress.style.display = "block";

        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Data = e.target.result.split(",")[1];
            try {
              const res = await apiCall("admin_uploadVideo", {
                berkas: {
                  nama: file.name,
                  mime: file.type || "video/mp4",
                  base64: base64Data
                },
                judul: file.name
              });

              document.getElementById("inputVideoUrl").value = res.url;
              showToast("Berkas video berhasil diunggah ke Google Drive!", "success");
            } catch (err) {
              showToast("Gagal mengunggah video: " + err.message, "error");
            } finally {
              if (vProgress) vProgress.style.display = "none";
            }
          };
          reader.readAsDataURL(file);
        } catch (e) {
          if (vProgress) vProgress.style.display = "none";
        }
      });
    }
  }

  // Tangani Submit Form Modal Koleksi
  document.getElementById("formCollectionItem").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sheetName = AppState.currentModalSheet;
    if (!sheetName) return;

    const btn = document.getElementById("btnSubmitCollection");
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Menyimpan ke Database...";

    const form = e.target;
    const formData = new FormData(form);
    const dataObj = {};

    for (let [k, v] of formData.entries()) {
      dataObj[k] = v;
    }

    // Tangani penamaan URL khusus Galeri
    if (sheetName === "Galeri") {
      const tipe = dataObj.tipe || "foto";
      dataObj.url = tipe === "foto" ? (dataObj.url_foto || "") : (dataObj.url_video || "");
      delete dataObj.url_foto;
      delete dataObj.url_video;
    }

    // Tangani thumbnail Pengumuman agar kompatibel dengan seluruh alias kolom sheet
    if (sheetName === "Pengumuman") {
      const photoVal = dataObj.fotoUrl || dataObj.bannerUrl || dataObj.foto || "";
      dataObj.fotoUrl = photoVal;
      dataObj.bannerUrl = photoVal;
      dataObj.foto = photoVal;
      dataObj.gambar = photoVal;
      dataObj.thumbnail = photoVal;

      if (dataObj.id && photoVal && !photoVal.startsWith("data:")) {
        try {
          localStorage.setItem("sdn_photo_" + dataObj.id, photoVal);
        } catch (e) {}
      }
    }

    // Status Tampil Boolean atau simpan PenggunaAdmin
    if (sheetName === "PenggunaAdmin") {
      const aktifInput = form.querySelector("input[name='aktif']");
      dataObj.aktif = aktifInput ? aktifInput.checked : true;
      try {
        await apiCall("admin_saveUser", { data: dataObj });
        if (dataObj.email && window.FirebaseAdminAuth) {
          try {
            await window.FirebaseAdminAuth.registerAdminInFirebase({
              email: dataObj.email,
              username: dataObj.namaPengguna,
              displayName: dataObj.namaTampil,
              role: dataObj.peran
            });
          } catch (fbErr) {
            console.warn("Sinkronisasi Firestore admin:", fbErr);
          }
        }
        showToast("Data pengguna berhasil disimpan & disinkronkan ke Firebase!", "success");
        AppCollections.closeModal();
        loadUsersList();
      } catch (err) {
        showToast("Gagal menyimpan pengguna: " + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
      return;
    }

    const tampilInput = form.querySelector("input[name='tampil']");
    dataObj.tampil = tampilInput ? tampilInput.checked : true;

    try {
      const saved = await apiCall("admin_saveRow", {
        sheetName: sheetName,
        data: dataObj
      });

      if (saved && saved.data) {
        const list = AppState.collections[sheetName] || [];
        const idx = list.findIndex((x) => String(x.id) === String(saved.id));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...saved.data, id: saved.id };
        } else {
          list.unshift({ ...saved.data, id: saved.id });
        }
        AppState.collections[sheetName] = list;
        renderCollectionTable(sheetName, list);
      } else {
        loadCollection(sheetName);
      }

      showToast(`Data ${sheetName} berhasil disimpan dan disinkronkan!`, "success");
      AppCollections.closeModal();
    } catch (err) {
      showToast("Gagal menyimpan: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });

  // ==========================================
  // 9. PENGGUNA ADMIN & AUDIT LOG
  // ==========================================
  const btnTambahUser = document.getElementById("btnTambahUser");
  if (btnTambahUser) {
    btnTambahUser.addEventListener("click", () => {
      AppCollections.openModal("PenggunaAdmin", null);
    });
  }

  async function loadUsersList() {
    const tbody = document.getElementById("tableUsersBody");
    try {
      const list = await apiCall("admin_listUsers");
      AppState.usersList = list || [];
      tbody.innerHTML = (list || [])
        .map(
          (u) => `
        <tr>
          <td>
            <code>${escapeHtml(u.namaPengguna)}</code>
            ${u.email ? `<br><small style="color: #b45309; font-size: 0.76rem;">🔥 ${escapeHtml(u.email)}</small>` : ''}
          </td>
          <td><strong>${escapeHtml(u.namaTampil)}</strong></td>
          <td><span class="role-pill ${u.peran}">${formatRoleName(u.peran)}</span></td>
          <td>${u.aktif ? '<span style="color: var(--success); font-weight: 700;">Aktif</span>' : '<span style="color: var(--danger);">Nonaktif</span>'}</td>
          <td><button type="button" class="btn btn-outline btn-sm" onclick="AppCollections.openModal('PenggunaAdmin', '${escapeHtml(u.id)}')">✏️ Edit</button></td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat pengguna.</td></tr>`;
    }
  }

  async function loadAuditLog() {
    const tbody = document.getElementById("tableLogBody");
    try {
      const logs = await apiCall("admin_listLog");
      tbody.innerHTML = (logs || [])
        .map(
          (l) => `
        <tr>
          <td><small>${l.waktu}</small></td>
          <td><strong>${escapeHtml(l.pengguna)}</strong></td>
          <td><code>${escapeHtml(l.aksi)}</code></td>
          <td>${escapeHtml(l.modul)}</td>
          <td>${escapeHtml(l.ringkasan)}</td>
        </tr>
      `
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger);">Gagal memuat log aktivitas.</td></tr>`;
    }
  }

  // ==========================================
  // 10. HELPER NOTIFIKASI TOAST & SANITASI
  // ==========================================
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
  window.showToast = showToast;

  function formatPhotoUrl(url) {
    if (!url) return "";
    const clean = String(url).trim();
    if (
      clean.startsWith("data:") ||
      clean.startsWith("blob:") ||
      clean.startsWith("/api/media/") ||
      clean.startsWith("/api/drive-image") ||
      clean.startsWith("/assets/")
    ) {
      return clean;
    }
    if (clean.startsWith("../assets/")) {
      return "/" + clean.slice(3);
    }
    if (clean.startsWith("assets/")) {
      return "/" + clean;
    }
    const fileId = extractDriveId(clean);
    if (fileId) {
      return `/api/drive-image?id=${fileId}`;
    }
    return clean;
  }

  function handleAdminImgError(imgEl, driveId) {
    if (!imgEl) return;
    const cur = imgEl.src || "";
    if (driveId && cur.includes("/api/drive-image")) {
      imgEl.src = `https://lh3.googleusercontent.com/d/${driveId}=w1000`;
      return;
    }
    if (driveId && cur.includes("googleusercontent.com")) {
      imgEl.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      return;
    }
    imgEl.onerror = null;
    imgEl.src = "/assets/img/pengumuman-sumpah-pemuda.svg";
  }
  window.handleAdminImgError = handleAdminImgError;

  function extractDriveId(url) {
    if (!url) return null;
    const str = String(url).trim();
    const m1 = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    const m3 = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m3) return m3[1];
    return null;
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();

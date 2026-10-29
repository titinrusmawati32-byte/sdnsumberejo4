/**
 * Logika Frontend SDN Sumberejo 04 Ambulu
 * Menangani interaksi UI, navigasi mobile drawer, pemanggilan API GAS,
 * sinkronisasi real-time SSE/BroadcastChannel, validasi form, dan rendering data dinamis.
 */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initGlobalData();
  initHomyzTransitions();
  initPageSpecific();
  initRealtimeSync();
});

// ==========================================
// 1. TRANSISI, SCROLL REVEAL & PREFERS-REDUCED-MOTION
// ==========================================
function initHomyzTransitions() {
  initNavbarScrollEffect();
  initHeroVideoAccessibility();
  triggerHomyzReveal();
  initAnimatedCounters();
}

function initHeroVideoAccessibility() {
  const video = document.getElementById("heroBgVideo");
  if (!video) return;
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    try {
      video.pause();
      video.removeAttribute("autoplay");
    } catch (e) {}
  }
}

function initNavbarScrollEffect() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const handleScroll = () => {
    if (window.scrollY > 24) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

function triggerHomyzReveal() {
  const targets = document.querySelectorAll(
    ".section, .card, .pillar-card, .pengumuman-card, .galeri-card, .stat-card, .section-header, .steps-grid > *, .hero-badge, .cta-banner, .footer-col, .homyz-reveal"
  );

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -24px 0px"
    }
  );

  targets.forEach((el) => {
    if (!el.classList.contains("homyz-reveal")) {
      el.classList.add("homyz-reveal");
    }
    observer.observe(el);
  });
}
window.triggerHomyzReveal = triggerHomyzReveal;

function initAnimatedCounters() {
  const statNumbers = document.querySelectorAll(".stat-number");
  if (statNumbers.length === 0) return;

  const animateNumber = (el, targetStr) => {
    const numericMatch = targetStr.match(/\d+/);
    if (!numericMatch) return;

    const numericVal = parseInt(numericMatch[0], 10);
    const isPercent = targetStr.includes("%");
    const isPlus = targetStr.includes("+");

    const duration = 1200;
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easeProgress * numericVal);

      el.textContent = `${currentVal}${isPlus ? "+" : ""}${isPercent ? "%" : ""}`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = targetStr;
      }
    };

    requestAnimationFrame(updateCounter);
  };

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const targetText = el.textContent.trim();
          animateNumber(el, targetText);
          obs.unobserve(el);
        }
      });
    },
    { threshold: 0.4 }
  );

  statNumbers.forEach((el) => observer.observe(el));
}

// ==========================================
// 2. NAVIGASI, MOBILE DRAWER & SCROLLSPY
// ==========================================
function initNavigation() {
  const toggleBtn = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const navBackdrop = document.getElementById("navBackdrop");
  const navCloseBtn = document.getElementById("navCloseBtn");

  const setDrawerState = (isOpen) => {
    if (!toggleBtn || !navMenu) return;
    toggleBtn.classList.toggle("open", isOpen);
    navMenu.classList.toggle("open", isOpen);
    toggleBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("nav-open", isOpen);
    if (navBackdrop) {
      navBackdrop.classList.toggle("open", isOpen);
    }
  };

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !navMenu.classList.contains("open");
      setDrawerState(willOpen);
    });

    if (navCloseBtn) {
      navCloseBtn.addEventListener("click", () => setDrawerState(false));
    }

    if (navBackdrop) {
      navBackdrop.addEventListener("click", () => setDrawerState(false));
    }

    document.addEventListener("click", (e) => {
      if (
        navMenu.classList.contains("open") &&
        !navMenu.contains(e.target) &&
        !toggleBtn.contains(e.target)
      ) {
        setDrawerState(false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (navMenu.classList.contains("open")) {
          setDrawerState(false);
        }
        closePengumumanModal();
        closeAllPengumumanModal();
        closeGaleriLightbox();
      }
    });
  }

  const navLinks = document.querySelectorAll(".nav-link");
  const isHomePage =
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/" ||
    window.location.pathname.split("/").pop() === "";

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      const isAnchor = href.startsWith("#") || (isHomePage && href.includes("#"));

      if (isAnchor) {
        const targetId = href.startsWith("#") ? href.slice(1) : href.split("#")[1];
        const targetEl = document.getElementById(targetId);

        if (targetEl) {
          e.preventDefault();
          const headerOffset = 82;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });

          navLinks.forEach((l) => {
            if (!l.classList.contains("nav-cta")) l.classList.remove("active");
          });
          if (!link.classList.contains("nav-cta")) {
            link.classList.add("active");
          }

          setDrawerState(false);
        }
      } else {
        setDrawerState(false);
      }
    });
  });

  if (isHomePage) {
    initScrollSpy();
  } else {
    const currentPath = window.location.pathname.split("/").pop();
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === currentPath && !link.classList.contains("nav-cta")) {
        navLinks.forEach((l) => {
          if (!l.classList.contains("nav-cta")) l.classList.remove("active");
        });
        link.classList.add("active");
      }
    });
  }
}

function initScrollSpy() {
  const sectionIds = [
    "beranda",
    "pengumuman",
    "profil",
    "program",
    "guru",
    "galeri",
    "fasilitas",
    "spmb",
    "kontak"
  ];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  if (sections.length === 0) return;

  const navLinks = document.querySelectorAll(".nav-menu .nav-link:not(.nav-cta)");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const activeId = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            const href = link.getAttribute("href") || "";
            const cleanHref = href.startsWith("#") ? href.slice(1) : href.split("#")[1];
            if (cleanHref === activeId) {
              link.classList.add("active");
            } else {
              link.classList.remove("active");
            }
          });
        }
      });
    },
    {
      rootMargin: "-22% 0px -58% 0px",
      threshold: 0
    }
  );

  sections.forEach((sec) => observer.observe(sec));
}

// ==========================================
// 3. DATA GLOBAL DARI GETSITECONFIG & SINKRONISASI REAL-TIME
// ==========================================
function applyConfigToDom(config) {
  if (!config) return;

  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (config[key] !== undefined && config[key] !== "") {
      const valStr = String(config[key]);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = valStr;
      } else if (el.tagName === "A" && key === "whatsapp") {
        const cleanWa = valStr.replace(/\D/g, "");
        el.href = `https://wa.me/${cleanWa}?text=Halo%20Admin%20${encodeURIComponent(config.namaSekolah || "SDN Sumberejo 04 Ambulu")},%20saya%20ingin%20bertanya%20informasi%20sekolah.`;
      } else if (el.tagName === "A" && key === "telepon") {
        el.href = `tel:${valStr}`;
        el.textContent = valStr;
      } else if (el.tagName === "A" && key === "email") {
        el.href = `mailto:${valStr}`;
        el.textContent = valStr;
      } else if (el.tagName === "IFRAME" && key === "mapEmbedUrl") {
        if (el.src !== valStr) el.src = valStr;
      } else if (key === "misiTeks" && (el.tagName === "OL" || el.tagName === "UL")) {
        const lines = valStr
          .split(/\r?\n/)
          .map((l) => l.replace(/^\s*\d+[\.\)]\s*/, "").trim())
          .filter(Boolean);
        if (lines.length > 0) {
          el.innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
        }
      } else if (key === "visiTeks") {
        const trimmed = valStr.trim();
        el.textContent = trimmed.startsWith('"') ? trimmed : `"${trimmed}"`;
      } else if (key === "sambutanKepsek") {
        el.innerHTML = formatSambutanHtml(valStr);
      } else {
        el.textContent = valStr;
      }
    }
  });

  const floatWa = document.getElementById("floatingWa");
  if (floatWa && config.whatsapp) {
    const cleanWa = String(config.whatsapp).replace(/\D/g, "");
    floatWa.href = `https://wa.me/${cleanWa}?text=Halo%20Admin%20${encodeURIComponent(config.namaSekolah || "SDN Sumberejo 04 Ambulu")},%20saya%20ingin%20bertanya.`;
  }

  const spmbStatusBadges = document.querySelectorAll(".spmb-status-badge");
  spmbStatusBadges.forEach((badge) => {
    if (config.spmbStatus === "buka") {
      badge.className = "spmb-status-badge alert alert-success";
      badge.innerHTML = `<strong>SPMB Telah Dibuka!</strong> Pendaftaran peserta didik baru dibuka mulai tanggal ${formatDateId(config.spmbMulai)} hingga ${formatDateId(config.spmbSelesai)}.`;
    } else {
      badge.className = "spmb-status-badge alert alert-warning";
      badge.innerHTML = `<strong>Pendaftaran Ditutup.</strong> ${config.spmbJadwalBerikutnya || "Nantikan informasi pembukaan gelombang berikutnya."}`;
    }
  });
}

function initGlobalData() {
  try {
    const cached = localStorage.getItem("sdn_site_config");
    if (cached) {
      applyConfigToDom(JSON.parse(cached));
    }
  } catch (e) {}

  SchoolAPI.get("getSiteConfig")
    .then((freshConfig) => {
      if (freshConfig && Object.keys(freshConfig).length > 0) {
        try {
          localStorage.setItem("sdn_site_config", JSON.stringify(freshConfig));
        } catch (e) {}
        applyConfigToDom(freshConfig);
      }
    })
    .catch(() => {});
}

function safeLocalStorageSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}

function applyRealtimeBundle(bundle) {
  if (!bundle) return;
  if (bundle.config && Object.keys(bundle.config).length > 0) {
    safeLocalStorageSet("sdn_site_config", bundle.config);
    applyConfigToDom(bundle.config);
  }
  if (Array.isArray(bundle.pengumuman)) {
    safeLocalStorageSet("sdn_pengumuman_list", bundle.pengumuman);
    const pContainer = document.getElementById("pengumumanContainer");
    if (pContainer) renderPengumumanCards(pContainer, bundle.pengumuman);
  }
  if (Array.isArray(bundle.guru)) {
    safeLocalStorageSet("sdn_guru_list", bundle.guru);
    const gContainer = document.getElementById("guruContainer");
    if (gContainer) renderGuruCards(gContainer, bundle.guru);
    updateKepsekPhotoFromGuru(bundle.guru);
  }
  if (Array.isArray(bundle.ekskul)) {
    safeLocalStorageSet("sdn_ekskul_list", bundle.ekskul);
    const eContainer = document.getElementById("ekskulContainer");
    if (eContainer) renderEkskulCards(eContainer, bundle.ekskul);
  }
  if (Array.isArray(bundle.fasilitas)) {
    safeLocalStorageSet("sdn_fasilitas_list", bundle.fasilitas);
    const fContainer = document.getElementById("fasilitasContainer");
    if (fContainer) renderFasilitasCards(fContainer, bundle.fasilitas);
  }
  if (Array.isArray(bundle.galeri)) {
    safeLocalStorageSet("sdn_galeri_list", bundle.galeri);
    const galContainer = document.getElementById("galeriContainer");
    if (galContainer) renderGaleriCards(galContainer, bundle.galeri);
  }
}

function initRealtimeSync() {
  if ("BroadcastChannel" in window) {
    try {
      const bc = new BroadcastChannel("sdn_cms_realtime");
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.bundle) {
          applyRealtimeBundle(ev.data.bundle);
        } else {
          SchoolAPI.get("getSiteBundle").then(applyRealtimeBundle).catch(() => {});
        }
      };
    } catch (e) {}
  }

  if ("EventSource" in window && window.APP_CONFIG && window.APP_CONFIG.SSE_URL) {
    try {
      const es = new EventSource(window.APP_CONFIG.SSE_URL);
      es.addEventListener("cms_update", (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload && payload.bundle) {
            applyRealtimeBundle(payload.bundle);
          }
        } catch (err) {}
      });
    } catch (e) {}
  }

  window.addEventListener("storage", (ev) => {
    if (!ev.key || !ev.newValue) return;
    try {
      if (ev.key === "sdn_site_config") {
        applyConfigToDom(JSON.parse(ev.newValue));
      } else if (ev.key === "sdn_pengumuman_list") {
        const c = document.getElementById("pengumumanContainer");
        if (c) renderPengumumanCards(c, JSON.parse(ev.newValue));
      } else if (ev.key === "sdn_guru_list") {
        const list = JSON.parse(ev.newValue);
        const c = document.getElementById("guruContainer");
        if (c) renderGuruCards(c, list);
        updateKepsekPhotoFromGuru(list);
      } else if (ev.key === "sdn_ekskul_list") {
        const c = document.getElementById("ekskulContainer");
        if (c) renderEkskulCards(c, JSON.parse(ev.newValue));
      } else if (ev.key === "sdn_fasilitas_list") {
        const c = document.getElementById("fasilitasContainer");
        if (c) renderFasilitasCards(c, JSON.parse(ev.newValue));
      } else if (ev.key === "sdn_galeri_list") {
        const c = document.getElementById("galeriContainer");
        if (c) renderGaleriCards(c, JSON.parse(ev.newValue));
      }
    } catch (e) {}
  });
}

// ==========================================
// 4. LOGIKA TIAP HALAMAN
// ==========================================
function initPageSpecific() {
  const path = window.location.pathname.split("/").pop() || "index.html";

  if (path === "index.html" || path === "" || path === "pengumuman.html") {
    initHomePage();
  } else if (path === "guru.html") {
    initGuruPage();
  } else if (path === "program.html") {
    initProgramPage();
  } else if (path === "fasilitas.html") {
    initFasilitasPage();
  } else if (path === "spmb.html") {
    initSpmbPage();
  } else if (path === "daftar.html") {
    initDaftarPage();
  } else if (path === "kontak.html") {
    initKontakPage();
  }
}

// ------------------------------------------
// Berita & Pengumuman (Featured + Portal Cards)
// ------------------------------------------
const DEFAULT_FEATURED_PENGUMUMAN = [
  {
    id: "ann-sumpah-pemuda-2026",
    judul: "PERINGATAN HARI SUMPAH PEMUDA",
    tanggal: "2026-10-28",
    kategori: "Kegiatan Sekolah",
    kategoriClass: "blue",
    kategoriIcon: "📢",
    fotoUrl: "assets/img/pengumuman-sumpah-pemuda.svg",
    bannerUrl: "assets/img/pengumuman-sumpah-pemuda.svg",
    fallbackSvg: "assets/img/pengumuman-sumpah-pemuda.svg",
    isi: "Diberitahukan kepada seluruh siswa-siswi dan orang tua/wali murid SDN Sumberejo 04 Ambulu, dalam rangka memperingati Hari Sumpah Pemuda pada tanggal 28 Oktober 2026, sekolah menyelenggarakan Upacara Bendera Peringatan Hari Sumpah Pemuda serta Kegiatan Literasi dan Kreativitas Siswa mulai pukul 07.00 WIB dengan mengenakan Pakaian Adat / Batik Sekolah."
  },
  {
    id: "ann-pts-2026",
    judul: "Jadwal Penilaian Tengah Semester (PTS)",
    tanggal: "2026-10-25",
    kategori: "Akademik",
    kategoriClass: "green",
    kategoriIcon: "📖",
    fotoUrl: "assets/img/pengumuman-pts.svg",
    bannerUrl: "assets/img/pengumuman-pts.svg",
    fallbackSvg: "assets/img/pengumuman-pts.svg",
    isi: "Diberitahukan kepada seluruh siswa-siswi kelas 1 s.d. kelas 6 bahwa pelaksanaan Penilaian Tengah Semester (PTS) akan dilaksanakan pada tanggal 2 November – 7 November 2026. Mohon seluruh peserta didik mempersiapkan diri dengan baik dan belajar secara teratur."
  },
  {
    id: "ann-rapat-ortu-2026",
    judul: "Rapat Koordinasi Orang Tua / Wali Murid",
    tanggal: "2026-10-22",
    kategori: "Orang Tua",
    kategoriClass: "purple",
    kategoriIcon: "👥",
    fotoUrl: "assets/img/pengumuman-rapat-ortu.svg",
    bannerUrl: "assets/img/pengumuman-rapat-ortu.svg",
    fallbackSvg: "assets/img/pengumuman-rapat-ortu.svg",
    isi: "Mengharap kehadiran Bapak/Ibu Orang Tua/Wali Murid kelas 1–6 pada pertemuan rutin komite dan wali kelas untuk membahas perkembangan pembelajaran semester berjalan serta penguatan program pembiasaan karakter siswa."
  }
];

let currentAllPengumumanList = [...DEFAULT_FEATURED_PENGUMUMAN];

function normalizePengumumanList(rawList) {
  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_FEATURED_PENGUMUMAN;
  }

  const mapSingleItem = (item, idx) => {
    let kategori = item.kategori !== undefined && item.kategori !== null ? String(item.kategori) : "";
    let kategoriClass = item.kategoriClass || "blue";
    let kategoriIcon = item.kategoriIcon || "📢";

    const judulStr = item.judul !== undefined && item.judul !== null ? String(item.judul) : "Pengumuman Sekolah";
    const isiStr = item.isi !== undefined && item.isi !== null ? String(item.isi) : "";
    const titleLower = judulStr.toLowerCase();

    if (kategori) {
      const catLower = kategori.toLowerCase();
      if (catLower.includes("akademik") || catLower.includes("belajar") || catLower.includes("ujian") || catLower.includes("pts")) {
        kategoriClass = "green";
        kategoriIcon = "📖";
      } else if (catLower.includes("orang tua") || catLower.includes("wali") || catLower.includes("rapat")) {
        kategoriClass = "purple";
        kategoriIcon = "👥";
      } else if (catLower.includes("kegiatan") || catLower.includes("ekskul") || catLower.includes("lomba") || catLower.includes("sumpah")) {
        kategoriClass = "blue";
        kategoriIcon = "📢";
      } else {
        kategoriClass = "amber";
        kategoriIcon = "📢";
      }
    } else {
      if (titleLower.includes("pts") || titleLower.includes("semester") || titleLower.includes("ujian") || titleLower.includes("akademik") || titleLower.includes("rapor")) {
        kategori = "Akademik";
        kategoriClass = "green";
        kategoriIcon = "📖";
      } else if (titleLower.includes("orang tua") || titleLower.includes("wali") || titleLower.includes("rapat") || titleLower.includes("komite")) {
        kategori = "Orang Tua";
        kategoriClass = "purple";
        kategoriIcon = "👥";
      } else if (titleLower.includes("sumpah pemuda") || titleLower.includes("upacara") || titleLower.includes("kegiatan") || titleLower.includes("pramuka") || titleLower.includes("lomba") || titleLower.includes("peringatan")) {
        kategori = "Kegiatan Sekolah";
        kategoriClass = "blue";
        kategoriIcon = "📢";
      } else {
        kategori = "Informasi Sekolah";
        kategoriClass = "amber";
        kategoriIcon = "📢";
      }
    }

    let fallbackSvg = "assets/img/pengumuman-sumpah-pemuda.svg";
    if (kategoriClass === "green" || titleLower.includes("pts") || titleLower.includes("semester")) {
      fallbackSvg = "assets/img/pengumuman-pts.svg";
    } else if (kategoriClass === "purple" || titleLower.includes("orang tua") || titleLower.includes("rapat") || titleLower.includes("wali")) {
      fallbackSvg = "assets/img/pengumuman-rapat-ortu.svg";
    }

    const localSavedPhoto = item.id ? localStorage.getItem("sdn_photo_" + item.id) : null;
    const rawUploaded =
      localSavedPhoto ||
      item.fotoUrl ||
      item.bannerUrl ||
      item.foto ||
      item.gambar ||
      item.thumbnail ||
      item.foto_url ||
      item.image ||
      item.url ||
      item.urlFoto ||
      "";
    const uploadedPhoto = String(rawUploaded);
    let isCustomPhoto = false;
    let bannerUrl = "";

    if (uploadedPhoto && uploadedPhoto.trim() !== "" && !uploadedPhoto.endsWith(".svg")) {
      bannerUrl = formatPhotoUrl(uploadedPhoto.trim());
      isCustomPhoto = true;
    } else if (uploadedPhoto && uploadedPhoto.includes("pts.svg")) {
      bannerUrl = "assets/img/pengumuman-pts.svg";
    } else if (uploadedPhoto && uploadedPhoto.includes("rapat-ortu.svg")) {
      bannerUrl = "assets/img/pengumuman-rapat-ortu.svg";
    } else if (
      uploadedPhoto &&
      uploadedPhoto.includes("sumpah-pemuda.svg") &&
      !titleLower.includes("pts") &&
      !titleLower.includes("rapat") &&
      !titleLower.includes("orang tua")
    ) {
      bannerUrl = "assets/img/pengumuman-sumpah-pemuda.svg";
    } else {
      bannerUrl = fallbackSvg;
    }

    return {
      id: item.id ? String(item.id) : `ann-${idx}-${Date.now()}`,
      judul: judulStr,
      tanggal: item.tanggal ? String(item.tanggal) : new Date().toISOString().split("T")[0],
      kategori,
      kategoriClass,
      kategoriIcon,
      bannerUrl,
      rawPhoto: uploadedPhoto,
      isCustomPhoto,
      fallbackSvg,
      isi: isiStr
    };
  };

  const processed = rawList.map(mapSingleItem);

  if (processed.length < 3) {
    const existingTitles = processed.map((x) => x.judul.toLowerCase());
    for (const def of DEFAULT_FEATURED_PENGUMUMAN) {
      if (!existingTitles.some((t) => t.includes(def.judul.toLowerCase()) || def.judul.toLowerCase().includes(t))) {
        processed.push(mapSingleItem(def, processed.length));
        if (processed.length >= 3) break;
      }
    }
  }

  return processed;
}

function renderPengumumanCards(container, list) {
  const items = normalizePengumumanList(list);
  currentAllPengumumanList = items;

  const displayItems = items.slice(0, 3);

  container.innerHTML = displayItems
    .map((item) => {
      const driveId = extractDriveId(item.rawPhoto || item.bannerUrl);
      const fallbackSvg = item.fallbackSvg || "assets/img/pengumuman-sumpah-pemuda.svg";
      return `
    <article class="pengumuman-card is-revealed">
      <div class="pengumuman-thumb-wrap">
        <img src="${escapeHtml(item.bannerUrl)}" 
             alt="${escapeHtml(item.judul)}" 
             class="pengumuman-thumb" 
             loading="lazy" 
             referrerpolicy="no-referrer"
             onerror="handleThumbError(this, '${driveId || ""}', '${fallbackSvg}')">
      </div>
      <div class="pengumuman-card-content">
        <div class="pengumuman-meta-row">
          <span class="pengumuman-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ${formatDateId(item.tanggal)}
          </span>
          <span class="pengumuman-category-badge badge-cat-${escapeHtml(item.kategoriClass || "blue")}">
            <span>${item.kategoriIcon || "📢"}</span> ${escapeHtml(item.kategori || "Informasi")}
          </span>
        </div>
        <h3 class="pengumuman-title">${escapeHtml(item.judul)}</h3>
        <p class="pengumuman-excerpt">${escapeHtml(item.isi)}</p>
        <div class="pengumuman-card-footer">
          <button type="button" class="btn-read-more" onclick="openPengumumanModal('${item.id}')">
            <span>Baca Selengkapnya</span>
            <span style="font-size: 1.1rem; font-weight: 700; line-height: 1;">&rarr;</span>
          </button>
        </div>
      </div>
    </article>
  `;
    })
    .join("");

  triggerHomyzReveal();
}

function openPengumumanModal(id) {
  const item = currentAllPengumumanList.find((x) => String(x.id) === String(id));
  if (!item) return;

  const modal = document.getElementById("modalPengumumanDetail");
  const content = document.getElementById("modalPengumumanContent");
  if (!modal || !content) return;

  const paragraphs = escapeHtml(item.isi)
    .split("\n")
    .filter((p) => p.trim() !== "")
    .map((p) => `<p style="margin-bottom: 0.85rem; line-height: 1.75; color: var(--body-text);">${p}</p>`)
    .join("");

  const modalDriveId = extractDriveId(item.rawPhoto || item.bannerUrl);
  const modalFallbackSvg = item.fallbackSvg || "assets/img/pengumuman-sumpah-pemuda.svg";

  content.innerHTML = `
    <div style="border-radius: 14px; overflow: hidden; margin-bottom: 1.25rem; max-height: 300px; background: var(--primary);">
      <img src="${escapeHtml(item.bannerUrl)}" alt="${escapeHtml(item.judul)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" loading="lazy" referrerpolicy="no-referrer" onerror="handleThumbError(this, '${modalDriveId || ""}', '${modalFallbackSvg}')">
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
      <span class="pengumuman-date" style="font-size: 0.9rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${formatDateId(item.tanggal)}
      </span>
      <span class="pengumuman-category-badge badge-cat-${escapeHtml(item.kategoriClass || "blue")}">
        <span>${item.kategoriIcon || "📢"}</span> ${escapeHtml(item.kategori || "Informasi")}
      </span>
    </div>
    <h2 style="font-size: 1.45rem; font-weight: 800; color: var(--heading); margin-bottom: 1.15rem; line-height: 1.35;">${escapeHtml(item.judul)}</h2>
    <div style="font-size: 0.98rem; line-height: 1.75; color: var(--body-text); margin-bottom: 1.75rem;">
      ${paragraphs}
    </div>
    <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
      <a href="https://wa.me/?text=${encodeURIComponent(item.judul + "\n\n" + item.isi)}" target="_blank" rel="noopener" class="btn btn-outline-primary btn-sm" style="color: var(--success); border-color: var(--success);">
        💬 Bagikan ke WhatsApp
      </a>
      <button type="button" class="btn btn-primary btn-sm" onclick="closePengumumanModal()">
        Tutup
      </button>
    </div>
  `;

  modal.classList.add("active");
}

function closePengumumanModal() {
  const modal = document.getElementById("modalPengumumanDetail");
  if (modal) modal.classList.remove("active");
}

function openAllPengumumanModal() {
  const modal = document.getElementById("modalAllPengumuman");
  const listEl = document.getElementById("modalAllPengumumanList");
  if (!modal || !listEl) return;

  listEl.innerHTML = currentAllPengumumanList
    .map((item) => {
      const driveId = extractDriveId(item.rawPhoto || item.bannerUrl);
      const fallbackSvg = item.fallbackSvg || "assets/img/pengumuman-sumpah-pemuda.svg";
      return `
    <div style="background: var(--bg-page); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.1rem; display: flex; gap: 1rem; align-items: center; transition: var(--transition);">
      <div style="width: 84px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--primary);">
        <img src="${escapeHtml(item.bannerUrl)}" alt="${escapeHtml(item.judul)}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" referrerpolicy="no-referrer" onerror="handleThumbError(this, '${driveId || ""}', '${fallbackSvg}')">
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
          <span style="font-size: 0.78rem; color: var(--muted-text);">📅 ${formatDateId(item.tanggal)}</span>
          <span class="pengumuman-category-badge badge-cat-${escapeHtml(item.kategoriClass || "blue")}" style="padding: 0.15rem 0.5rem; font-size: 0.72rem;">${escapeHtml(item.kategori)}</span>
        </div>
        <h4 style="margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 700; color: var(--heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.judul)}</h4>
        <p style="margin: 0; font-size: 0.85rem; color: var(--body-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(item.isi)}</p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" style="flex-shrink: 0;" onclick="closeAllPengumumanModal(); openPengumumanModal('${item.id}')">
        Baca
      </button>
    </div>
  `;
    })
    .join("");

  modal.classList.add("active");
}

function closeAllPengumumanModal() {
  const modal = document.getElementById("modalAllPengumuman");
  if (modal) modal.classList.remove("active");
}

window.openPengumumanModal = openPengumumanModal;
window.closePengumumanModal = closePengumumanModal;
window.openAllPengumumanModal = openAllPengumumanModal;
window.closeAllPengumumanModal = closeAllPengumumanModal;

// ------------------------------------------
// Galeri Kegiatan Sekolah & Lightbox
// ------------------------------------------
const DEFAULT_GALERI_ITEMS = [
  {
    id: "gal-1",
    judul: "Upacara Peringatan Hari Sumpah Pemuda & Kreasi Budaya",
    kategori: "Kegiatan Sekolah",
    tanggal: "2026-10-28",
    fotoUrl: "assets/img/pengumuman-sumpah-pemuda.svg"
  },
  {
    id: "gal-2",
    judul: "Kegiatan Belajar Mengajar & Evaluasi Akademik Terpadu",
    kategori: "Akademik & Literasi",
    tanggal: "2026-10-25",
    fotoUrl: "assets/img/pengumuman-pts.svg"
  },
  {
    id: "gal-3",
    judul: "Sinergi Orang Tua / Wali Murid & Komite Sekolah",
    kategori: "Kemitraan Keluarga",
    tanggal: "2026-10-22",
    fotoUrl: "assets/img/pengumuman-rapat-ortu.svg"
  }
];

let currentGaleriList = [...DEFAULT_GALERI_ITEMS];

function renderGaleriCards(container, list) {
  if (!container) return;
  const rawItems = Array.isArray(list) && list.length > 0 ? list : DEFAULT_GALERI_ITEMS;
  currentGaleriList = rawItems.map((item, idx) => {
    const rawUrl = item.fotoUrl || item.url || item.gambar || "assets/img/pengumuman-sumpah-pemuda.svg";
    return {
      id: item.id ? String(item.id) : `gal-${idx}`,
      judul: item.judul || item.nama || "Dokumentasi Kegiatan SDN Sumberejo 04",
      kategori: item.kategori || "Dokumentasi Sekolah",
      tanggal: item.tanggal || "",
      fotoUrl: formatPhotoUrl(rawUrl),
      rawPhoto: rawUrl
    };
  });

  container.innerHTML = currentGaleriList
    .slice(0, 6)
    .map((item) => {
      const driveId = extractDriveId(item.rawPhoto);
      return `
      <article class="galeri-card is-revealed" onclick="openGaleriLightbox('${escapeHtml(item.id)}')" tabindex="0" role="button" aria-label="Lihat foto ${escapeHtml(item.judul)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openGaleriLightbox('${escapeHtml(item.id)}');}">
        <img src="${escapeHtml(item.fotoUrl)}"
             alt="${escapeHtml(item.judul)}"
             loading="lazy"
             referrerpolicy="no-referrer"
             onerror="handleThumbError(this, '${driveId || ""}', 'assets/img/pengumuman-sumpah-pemuda.svg')">
        <div class="galeri-overlay">
          <span class="galeri-tag">${escapeHtml(item.kategori)}</span>
          <h3 class="galeri-title">${escapeHtml(item.judul)}</h3>
          ${item.tanggal ? `<span class="galeri-date">📅 ${formatDateId(item.tanggal)}</span>` : ""}
        </div>
      </article>
    `;
    })
    .join("");

  triggerHomyzReveal();
}

function openGaleriLightbox(id) {
  const item = currentGaleriList.find((x) => String(x.id) === String(id));
  if (!item) return;
  const modal = document.getElementById("modalGaleriLightbox");
  const content = document.getElementById("modalGaleriLightboxContent");
  if (!modal || !content) return;

  const driveId = extractDriveId(item.rawPhoto);
  content.innerHTML = `
    <div style="border-radius: 14px; overflow: hidden; background: var(--primary-dark); max-height: 70vh; display: flex; align-items: center; justify-content: center;">
      <img src="${escapeHtml(item.fotoUrl)}"
           alt="${escapeHtml(item.judul)}"
           style="width: 100%; max-height: 70vh; object-fit: contain; display: block;"
           referrerpolicy="no-referrer"
           onerror="handleThumbError(this, '${driveId || ""}', 'assets/img/pengumuman-sumpah-pemuda.svg')">
    </div>
    <div style="padding: 1rem 0.25rem 0.25rem;">
      <span class="section-tag" style="margin-bottom: 0.4rem;">${escapeHtml(item.kategori)}</span>
      <h3 style="margin: 0 0 0.25rem 0; color: var(--heading); font-size: 1.25rem;">${escapeHtml(item.judul)}</h3>
      ${item.tanggal ? `<p style="margin: 0; font-size: 0.85rem; color: var(--muted-text);">📅 ${formatDateId(item.tanggal)}</p>` : ""}
    </div>
  `;
  modal.classList.add("active");
}

function closeGaleriLightbox() {
  const modal = document.getElementById("modalGaleriLightbox");
  if (modal) modal.classList.remove("active");
}

window.openGaleriLightbox = openGaleriLightbox;
window.closeGaleriLightbox = closeGaleriLightbox;

function updateKepsekPhotoFromGuru(list) {
  const frame = document.getElementById("sambutanPhotoFrame");
  if (!frame || !Array.isArray(list) || list.length === 0) return;

  const kepsek =
    list.find((g) => String(g.jabatan || "").toLowerCase().includes("kepala")) ||
    list[0];
  if (!kepsek) return;

  const formattedUrl = formatPhotoUrl(kepsek.fotoUrl);
  const driveId = extractDriveId(kepsek.fotoUrl);
  const namaKepsek = kepsek.nama || "Kepala Sekolah SDN Sumberejo 04";

  if (formattedUrl) {
    frame.innerHTML = `
      <img src="${escapeHtml(formattedUrl)}"
           alt="${escapeHtml(namaKepsek)}"
           style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block;"
           loading="lazy"
           referrerpolicy="no-referrer"
           onerror="this.onerror=null; ${driveId ? `this.src='https://drive.google.com/thumbnail?id=${driveId}&sz=w1000';` : `this.style.display='none';`}">
      <div class="sambutan-badge-pill">${escapeHtml(namaKepsek)}</div>
    `;
  } else {
    frame.innerHTML = `
      <div style="font-size: 5.5rem; line-height: 1; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));">👨‍🏫</div>
      <div class="sambutan-badge-pill">${escapeHtml(namaKepsek)}</div>
    `;
  }
}

async function initHomePage() {
  const pContainer = document.getElementById("pengumumanContainer");
  const gContainer = document.getElementById("guruContainer");
  const eContainer = document.getElementById("ekskulContainer");
  const fContainer = document.getElementById("fasilitasContainer");
  const galContainer = document.getElementById("galeriContainer");

  // 1. Render instan (0ms) dari localStorage bila tersedia
  try {
    const cachedP = JSON.parse(localStorage.getItem("sdn_pengumuman_list") || "null");
    if (pContainer) {
      renderPengumumanCards(pContainer, Array.isArray(cachedP) && cachedP.length > 0 ? cachedP : DEFAULT_FEATURED_PENGUMUMAN);
    }
    const cachedG = JSON.parse(localStorage.getItem("sdn_guru_list") || "null");
    if (Array.isArray(cachedG) && cachedG.length > 0) {
      if (gContainer) renderGuruCards(gContainer, cachedG);
      updateKepsekPhotoFromGuru(cachedG);
    }
    const cachedE = JSON.parse(localStorage.getItem("sdn_ekskul_list") || "null");
    if (eContainer && Array.isArray(cachedE) && cachedE.length > 0) {
      renderEkskulCards(eContainer, cachedE);
    }
    const cachedF = JSON.parse(localStorage.getItem("sdn_fasilitas_list") || "null");
    if (fContainer && Array.isArray(cachedF) && cachedF.length > 0) {
      renderFasilitasCards(fContainer, cachedF);
    }
    const cachedGal = JSON.parse(localStorage.getItem("sdn_galeri_list") || "null");
    if (galContainer) {
      renderGaleriCards(galContainer, Array.isArray(cachedGal) && cachedGal.length > 0 ? cachedGal : DEFAULT_GALERI_ITEMS);
    }
  } catch (e) {
    if (pContainer) renderPengumumanCards(pContainer, DEFAULT_FEATURED_PENGUMUMAN);
    if (galContainer) renderGaleriCards(galContainer, DEFAULT_GALERI_ITEMS);
  }

  // 2. Ambil seluruh bundle situs dalam 1 panggilan cepat (<10ms via /api/gas -> Google Apps Script)
  try {
    const bundle = await SchoolAPI.get("getSiteBundle");
    if (bundle) {
      applyRealtimeBundle(bundle);
      return;
    }
  } catch (e) {}

  initGuruPage();
  initProgramPage();
  initFasilitasPage();
}

// ------------------------------------------
// Direktori Guru (guru.html)
// ------------------------------------------
function renderGuruCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted-text); padding: 3rem;">Belum ada data guru.</div>`;
    return;
  }
  container.innerHTML = list
    .map((guru) => {
      const formattedUrl = formatPhotoUrl(guru.fotoUrl);
      const driveId = extractDriveId(guru.fotoUrl);

      const photoHtml = formattedUrl
        ? `<div class="guru-photo-wrap">
             <img src="${escapeHtml(formattedUrl)}" 
                  alt="${escapeHtml(guru.nama)}" 
                  class="guru-photo" 
                  loading="lazy" 
                  referrerpolicy="no-referrer"
                  onerror="this.onerror=null; ${driveId ? `this.src='https://lh3.googleusercontent.com/d/${driveId}'; this.onerror=function(){this.parentElement.outerHTML=getDefaultAvatarHtml('${escapeHtml(guru.nama)}');};` : `this.parentElement.outerHTML=getDefaultAvatarHtml('${escapeHtml(guru.nama)}');`}">
           </div>`
        : getDefaultAvatarHtml(guru.nama);

      return `
      <div class="card guru-card">
        ${photoHtml}
        <div class="guru-card-body">
          <h3 class="guru-name">${escapeHtml(guru.nama)}</h3>
          <span class="guru-role-badge">${escapeHtml(guru.jabatan)}</span>
        </div>
      </div>
    `;
    })
    .join("");
  triggerHomyzReveal();
}

async function initGuruPage() {
  const container = document.getElementById("guruContainer");
  if (!container) return;

  try {
    const cached = localStorage.getItem("sdn_guru_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderGuruCards(container, parsed);
        updateKepsekPhotoFromGuru(parsed);
      }
    }
  } catch (e) {}

  try {
    const list = await SchoolAPI.get("getGuru");
    if (list && Array.isArray(list)) {
      safeLocalStorageSet("sdn_guru_list", list);
      renderGuruCards(container, list);
      updateKepsekPhotoFromGuru(list);
    }
  } catch (e) {}
}

// ------------------------------------------
// Program & Ekstrakurikuler (program.html)
// ------------------------------------------
function renderEkskulCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted-text); padding: 3rem;">Belum ada program ekstrakurikuler.</div>`;
    return;
  }
  container.innerHTML = list
    .map(
      (item) => `
    <div class="card">
      ${item.fotoUrl ? `<img src="${formatPhotoUrl(item.fotoUrl)}" alt="${escapeHtml(item.nama)}" class="card-img" referrerpolicy="no-referrer">` : ""}
      <div class="card-body">
        <h3 class="card-title" style="color: var(--primary);">${escapeHtml(item.nama)}</h3>
        <p>${escapeHtml(item.deskripsi)}</p>
        <div class="card-footer" style="font-size: 0.86rem; color: var(--muted-text);">
          <div><strong>Pembina:</strong> ${escapeHtml(item.pembina || "-")}</div>
          <div><strong>Jadwal:</strong> ${escapeHtml(item.jadwal || "-")}</div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
  triggerHomyzReveal();
}

async function initProgramPage() {
  const container = document.getElementById("ekskulContainer");
  if (!container) return;

  try {
    const cached = localStorage.getItem("sdn_ekskul_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) renderEkskulCards(container, parsed);
    }
  } catch (e) {}

  try {
    const list = await SchoolAPI.get("getEkskul");
    if (list && Array.isArray(list)) {
      safeLocalStorageSet("sdn_ekskul_list", list);
      renderEkskulCards(container, list);
    }
  } catch (e) {}
}

// ------------------------------------------
// Fasilitas (fasilitas.html)
// ------------------------------------------
function renderFasilitasCards(container, list) {
  if (!list || list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--muted-text); padding: 3rem;">Belum ada data fasilitas.</div>`;
    return;
  }
  container.innerHTML = list
    .map((fasilitas) => {
      const photoHtml = fasilitas.fotoUrl
        ? `<img src="${formatPhotoUrl(fasilitas.fotoUrl)}" alt="${escapeHtml(fasilitas.nama)}" class="card-img" referrerpolicy="no-referrer" onerror="this.outerHTML=getDefaultFacilityImgHtml()">`
        : getDefaultFacilityImgHtml();

      return `
      <div class="card">
        ${photoHtml}
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(fasilitas.nama)}</h3>
          <p>${escapeHtml(fasilitas.deskripsi)}</p>
        </div>
      </div>
    `;
    })
    .join("");
  triggerHomyzReveal();
}

async function initFasilitasPage() {
  const container = document.getElementById("fasilitasContainer");
  if (!container) return;

  try {
    const cached = localStorage.getItem("sdn_fasilitas_list");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) renderFasilitasCards(container, parsed);
    }
  } catch (e) {}

  try {
    const list = await SchoolAPI.get("getFasilitas");
    if (list && Array.isArray(list)) {
      safeLocalStorageSet("sdn_fasilitas_list", list);
      renderFasilitasCards(container, list);
    }
  } catch (e) {}
}

// ------------------------------------------
// SPMB Info (spmb.html)
// ------------------------------------------
async function initSpmbPage() {
  const btnDaftar = document.getElementById("btnKePendaftaran");
  const spmbAlert = document.getElementById("spmbStatusAlert");

  try {
    const config = await SchoolAPI.get("getSiteConfig");
    if (!config) return;

    if (config.spmbStatus === "buka") {
      if (spmbAlert) {
        spmbAlert.className = "alert alert-success";
        spmbAlert.innerHTML = `<strong>Pendaftaran Terbuka!</strong> Segera daftarkan putra/putri Anda. Periode berlangsung dari ${formatDateId(config.spmbMulai)} hingga ${formatDateId(config.spmbSelesai)}.`;
      }
      if (btnDaftar) {
        btnDaftar.classList.remove("btn-outline");
        btnDaftar.classList.add("btn-secondary");
      }
    } else {
      if (spmbAlert) {
        spmbAlert.className = "alert alert-warning";
        spmbAlert.innerHTML = `<strong>Pendaftaran Saat Ini Ditutup.</strong> ${config.spmbJadwalBerikutnya || "Informasi jadwal gelombang berikutnya akan diumumkan di sini."}`;
      }
      if (btnDaftar) {
        btnDaftar.removeAttribute("href");
        btnDaftar.style.opacity = "0.5";
        btnDaftar.style.cursor = "not-allowed";
        btnDaftar.textContent = "Pendaftaran Ditutup";
      }
    }
  } catch (e) {}
}

// ------------------------------------------
// Formulir Pendaftaran (daftar.html)
// ------------------------------------------
function initDaftarPage() {
  const form = document.getElementById("spmbForm");
  const alertContainer = document.getElementById("formAlertContainer");
  const submitBtn = document.getElementById("btnSubmitDaftar");
  const modal = document.getElementById("successModal");

  checkPeriodOnDaftar(form, submitBtn, alertContainer);

  setupFileInput("inputKk", "statusKk");
  setupFileInput("inputAkta", "statusAkta");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormAlert(alertContainer);

    const isValid = validateFormInputs(form);
    if (!isValid) {
      showFormAlert(alertContainer, "danger", "Harap periksa kembali isian formulir yang ditandai merah.");
      return;
    }

    const fileKk = document.getElementById("inputKk").files[0];
    const fileAkta = document.getElementById("inputAkta").files[0];

    if (!fileKk || !fileAkta) {
      showFormAlert(alertContainer, "danger", "Berkas Kartu Keluarga dan Akta Kelahiran wajib diunggah.");
      return;
    }

    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span class="spinner"></span> Sedang memproses dan mengunggah berkas...`;

    try {
      const [base64Kk, base64Akta] = await Promise.all([
        readFileAsBase64(fileKk),
        readFileAsBase64(fileAkta)
      ]);

      const payload = {
        action: "submitPendaftaran",
        honeypot: form.honeypot ? form.honeypot.value : "",
        data: {
          namaMurid: form.namaMurid.value.trim(),
          nik: form.nik.value.trim(),
          tempatLahir: form.tempatLahir.value.trim(),
          tanggalLahir: form.tanggalLahir.value.trim(),
          jenisKelamin: form.jenisKelamin.value,
          namaOrtu: form.namaOrtu.value.trim(),
          nikOrtu: form.nikOrtu.value.trim(),
          hp: form.hp.value.trim(),
          email: form.email.value.trim(),
          alamat: form.alamat.value.trim(),
          asalTk: form.asalTk ? form.asalTk.value.trim() : "",
          setujuData: form.setujuData.checked
        },
        berkas: [
          {
            field: "kk",
            nama: fileKk.name,
            mime: fileKk.type || "application/pdf",
            base64: base64Kk
          },
          {
            field: "akta",
            nama: fileAkta.name,
            mime: fileAkta.type || "application/pdf",
            base64: base64Akta
          }
        ]
      };

      const result = await SchoolAPI.post(payload);

      showSuccessModal(modal, result.nomorPendaftaran, payload.data);
      form.reset();
      document.getElementById("statusKk").textContent = "";
      document.getElementById("statusAkta").textContent = "";
    } catch (err) {
      showFormAlert(alertContainer, "danger", err.message || "Gagal mengirim formulir pendaftaran. Silakan coba kembali atau hubungi sekolah.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

async function checkPeriodOnDaftar(form, submitBtn, alertContainer) {
  try {
    const config = await SchoolAPI.get("getSiteConfig");
    if (config && config.spmbStatus !== "buka") {
      showFormAlert(alertContainer, "warning", `Pendaftaran SPMB saat ini sedang ditutup. ${config.spmbJadwalBerikutnya || ""}`);
      if (form) {
        const inputs = form.querySelectorAll("input, select, textarea, button");
        inputs.forEach((el) => (el.disabled = true));
      }
    }
  } catch (e) {}
}

function setupFileInput(inputId, statusId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  if (!input || !status) return;

  input.addEventListener("change", () => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 2 * 1024 * 1024) {
        status.style.color = "var(--danger)";
        status.textContent = `❌ Ukuran berkas terlalu besar (${sizeMb} MB). Maksimal 2 MB.`;
        input.value = "";
      } else {
        status.style.color = "var(--success)";
        status.textContent = `✓ ${file.name} (${sizeMb} MB) siap diunggah`;
      }
    } else {
      status.textContent = "";
    }
  });
}

function validateFormInputs(form) {
  let isValid = true;

  const markField = (input, valid, msg) => {
    const feedback = input.parentElement.querySelector(".invalid-feedback");
    if (!valid) {
      input.classList.add("is-invalid");
      if (feedback) feedback.textContent = msg;
      isValid = false;
    } else {
      input.classList.remove("is-invalid");
    }
  };

  const namaMurid = form.namaMurid;
  markField(namaMurid, namaMurid.value.trim().length > 0 && namaMurid.value.length <= 100, "Nama lengkap calon murid wajib diisi (maks 100 karakter).");

  const nik = form.nik;
  markField(nik, /^\d{16}$/.test(nik.value.trim()), "NIK murid harus tepat 16 digit angka.");

  const tempatLahir = form.tempatLahir;
  markField(tempatLahir, tempatLahir.value.trim().length > 0, "Tempat lahir wajib diisi.");

  const tanggalLahir = form.tanggalLahir;
  const isDateValid = /^\d{4}-\d{2}-\d{2}$/.test(tanggalLahir.value.trim()) && new Date(tanggalLahir.value) <= new Date();
  markField(tanggalLahir, isDateValid, "Pilih tanggal lahir yang valid (tidak melebihi hari ini).");

  const jenisKelamin = form.jenisKelamin;
  markField(jenisKelamin, jenisKelamin.value !== "", "Pilih jenis kelamin.");

  const namaOrtu = form.namaOrtu;
  markField(namaOrtu, namaOrtu.value.trim().length > 0, "Nama orang tua/wali wajib diisi.");

  const nikOrtu = form.nikOrtu;
  markField(nikOrtu, /^\d{16}$/.test(nikOrtu.value.trim()), "NIK orang tua/wali harus tepat 16 digit angka.");

  const hp = form.hp;
  markField(hp, /^(08|62)\d{8,12}$/.test(hp.value.trim()), "Nomor HP/WA harus diawali 08 atau 62 (10-14 digit).");

  const email = form.email;
  if (email.value.trim() !== "") {
    markField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()), "Format email tidak valid.");
  } else {
    markField(email, true);
  }

  const alamat = form.alamat;
  markField(alamat, alamat.value.trim().length > 0 && alamat.value.length <= 250, "Alamat domisili wajib diisi (maks 250 karakter).");

  const setuju = form.setujuData;
  if (!setuju.checked) {
    setuju.classList.add("is-invalid");
    isValid = false;
  } else {
    setuju.classList.remove("is-invalid");
  }

  return isValid;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function showSuccessModal(modal, nomorPendaftaran, data) {
  if (!modal) return;
  const regNumberEl = document.getElementById("modalNomorPendaftaran");
  const detailEl = document.getElementById("modalDataRingkas");

  if (regNumberEl) regNumberEl.textContent = nomorPendaftaran;
  if (detailEl) {
    detailEl.innerHTML = `
      <table style="width: 100%; text-align: left; font-size: 0.9rem; margin-top: 1rem; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: var(--muted-text);">Nama Calon Murid:</td><td><strong>${escapeHtml(data.namaMurid)}</strong></td></tr>
        <tr><td style="padding: 4px 0; color: var(--muted-text);">NIK Murid:</td><td>${escapeHtml(data.nik)}</td></tr>
        <tr><td style="padding: 4px 0; color: var(--muted-text);">Orang Tua / Wali:</td><td>${escapeHtml(data.namaOrtu)}</td></tr>
        <tr><td style="padding: 4px 0; color: var(--muted-text);">No. WhatsApp:</td><td>${escapeHtml(data.hp)}</td></tr>
      </table>
    `;
  }

  modal.classList.add("active");

  const btnCopy = document.getElementById("btnSalinNomor");
  if (btnCopy) {
    btnCopy.onclick = () => {
      navigator.clipboard.writeText(nomorPendaftaran).then(() => {
        btnCopy.textContent = "✓ Tersalin!";
        setTimeout(() => (btnCopy.textContent = "Salin Nomor"), 2000);
      });
    };
  }

  const btnTutup = document.getElementById("btnTutupModal");
  if (btnTutup) {
    btnTutup.onclick = () => modal.classList.remove("active");
  }
}

function showFormAlert(container, type, message) {
  if (!container) return;
  container.className = `alert alert-${type}`;
  container.textContent = message;
  container.style.display = "block";
  container.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideFormAlert(container) {
  if (!container) return;
  container.style.display = "none";
}

function initKontakPage() {}

// ==========================================
// 5. HELPER & FORMATTER
// ==========================================
function formatDateId(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatSambutanHtml(rawText) {
  if (!rawText) return "";
  // Bersihkan heading markdown seperti "# SAMBUTAN KEPALA SEKOLAH" atau "### SDN SUMBEREJO 04"
  const cleaned = String(rawText)
    .replace(/#+\s*SAMBUTAN KEPALA SEKOLAH\s*/gi, "")
    .replace(/#+\s*SDN SUMBEREJO 04(\s*AMBULU)?\s*/gi, "")
    .replace(/^#+\s+/gm, "")
    .trim();

  // Pecah menjadi paragraf yang nyaman dibaca
  let paragraphs = cleaned
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Jika seluruh teks berada dalam 1 baris panjang, pecah setiap ~3 kalimat agar mudah dipindai
  if (paragraphs.length === 1 && paragraphs[0].length > 360) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+(\s|$)/g) || [paragraphs[0]];
    paragraphs = [];
    let chunk = "";
    sentences.forEach((s, idx) => {
      chunk += s;
      if ((idx + 1) % 3 === 0 || idx === sentences.length - 1) {
        paragraphs.push(chunk.trim());
        chunk = "";
      }
    });
  }

  const formatInlineBold = (str) =>
    escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--heading);">$1</strong>');

  if (paragraphs.length <= 3) {
    return paragraphs
      .map((p) => `<span style="display: block; margin-bottom: 0.85rem;">${formatInlineBold(p)}</span>`)
      .join("");
  }

  const previewHtml = paragraphs
    .slice(0, 3)
    .map((p) => `<span style="display: block; margin-bottom: 0.85rem;">${formatInlineBold(p)}</span>`)
    .join("");
  const restHtml = paragraphs
    .slice(3)
    .map((p) => `<span style="display: block; margin-bottom: 0.85rem;">${formatInlineBold(p)}</span>`)
    .join("");

  return `
    ${previewHtml}
    <span id="sambutanMoreText" style="display: none;">${restHtml}</span>
    <button type="button" id="btnToggleSambutan" onclick="const more=document.getElementById('sambutanMoreText'); const open=more.style.display==='inline'; more.style.display=open?'none':'inline'; this.textContent=open?'Baca Sambutan Selengkapnya ▾':'Sembunyikan ▴';" style="background: none; border: none; padding: 0; color: var(--secondary-blue); font-family: var(--font-display); font-weight: 700; font-size: 0.9rem; cursor: pointer;">
      Baca Sambutan Selengkapnya ▾
    </button>
  `;
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

function getDefaultAvatarHtml(nama) {
  const initial = (nama || "G").charAt(0).toUpperCase();
  return `
    <div class="guru-photo-wrap" style="background: linear-gradient(145deg, #0B1F3A 0%, #164E8A 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF;">
      <div style="font-family: var(--font-display); font-size: 4.25rem; font-weight: 800; line-height: 1; color: var(--accent-gold); text-shadow: 0 4px 12px rgba(0,0,0,0.2);">${initial}</div>
      <div style="font-size: 0.78rem; opacity: 0.9; margin-top: 0.5rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700;">Pendidik SDN 04</div>
    </div>
  `;
}

function formatPhotoUrl(url) {
  if (!url) return "";
  const clean = String(url).trim();
  if (
    clean.startsWith("data:") ||
    clean.startsWith("blob:") ||
    clean.startsWith("/api/media/") ||
    clean.startsWith("/api/drive-image") ||
    clean.startsWith("assets/") ||
    clean.startsWith("./assets/") ||
    clean.startsWith("/assets/")
  ) {
    return clean;
  }
  const fileId = extractDriveId(clean);
  if (fileId) {
    return `/api/drive-image?id=${fileId}`;
  }
  return clean;
}

function handleThumbError(imgEl, driveId, fallbackSvg) {
  if (!imgEl) return;
  const cur = imgEl.src || "";
  if (driveId && cur.includes("/api/drive-image")) {
    imgEl.src = `https://lh3.googleusercontent.com/d/${driveId}=w1200`;
    return;
  }
  if (driveId && cur.includes("googleusercontent.com")) {
    imgEl.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`;
    return;
  }
  if (driveId && cur.includes("thumbnail?id=")) {
    imgEl.src = `https://drive.google.com/uc?export=view&id=${driveId}`;
    return;
  }
  imgEl.onerror = null;
  imgEl.src = fallbackSvg || "assets/img/pengumuman-pts.svg";
}
window.handleThumbError = handleThumbError;

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

function getDefaultFacilityImgHtml() {
  return `
    <div class="card-img" style="background: var(--bg-muted); color: var(--primary); font-size: 2.75rem;">
      🏫
    </div>
  `;
}

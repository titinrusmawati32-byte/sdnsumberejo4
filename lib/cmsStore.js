/**
 * Decoupled CMS & Public API Store for SD Negeri Sumberejo 04
 * Implements the full Google Apps Script contract (doGet & doPost actions)
 * with real-time Google Apps Script hydration & write-through synchronization.
 */

import crypto from "node:crypto";

export function createCmsStore() {
  const config = {
    namaSekolah: "SDN SUMBEREJO 04 AMBULU",
    alamat: "Jl Lapangan No 88 Krajan Kidul Sumberejo Kecamatan Ambulu Jember Jawatimur",
    telepon: "(0338) 123456",
    email: "sumbersdn@gmail.com",
    whatsapp: "6281933775544",
    jamLayanan: "Senin - Kamis, 07:00 - 13:00 WIB",
    mapEmbedUrl: "https://maps.google.com/maps?q=SDN+Sumberejo&t=&z=15&ie=UTF8&iwloc=&output=embed",
    spmbStatus: "buka",
    spmbMulai: "2027-01-10",
    spmbSelesai: "2027-01-31",
    spmbJadwalBerikutnya: "Pendaftaran Gelombang Berikutnya dibuka Mei 2027",
    biayaPendaftaran: "Gratis (Bebas Biaya)",
    akreditasi: "A",
    jumlahSiswa: "286",
    jumlahGuru: "19",
    sambutanKepsek:
      "Assalamu’alaikum warahmatullahi wabarakatuh. Puji syukur kita panjatkan ke hadirat Allah SWT, Tuhan Yang Maha Esa. Selamat datang di website resmi SDN Sumberejo 04. Kami berkomitmen untuk menjadikan SDN Sumberejo 04 sebagai lingkungan pendidikan yang aman, nyaman, inklusif, dan menyenangkan bagi seluruh peserta didik.",
    visiTeks:
      "MENJADI SEKOLAH KREATIF MODERN YANG UNGGUL DALAM PRESTASI DAN MULIA DALAM BERAKHLAQ",
    misiTeks: [
      "- Menumbuhkembangkan penghayatan dan pengamalan nilai-nilai keagamaan dalam kehidupan sehari-hari di lingkungan sekolah.",
      "- Menyelenggarakan proses pembelajaran yang inovatif, kreatif, efektif, menyenangkan, dan berpusat pada murid (Student-Centered Learning).",
      "- Mendorong dan memfasilitasi minat, bakat, serta potensi siswa melalui kegiatan akademik dan ekstrakurikuler yang terarah.",
      "- Membentuk karakter disiplin, sopan santun, gotong royong, dan cinta tanah air sesuai nilai-nilai Profil Pelajar Pancasila.",
      "- Menciptakan budaya sekolah yang bersih, sehat, rindang, ramah anak, dan peduli terhadap kelestarian lingkungan."
    ].join("\n"),
    sejarahTeks:
      "SDN Sumberejo 04 didirikan pada tahun 1960, sebagai bagian dari upaya untuk mendukung program pendidikan dasar di wilayah Kec. Ambulu khususnya Desa Sumberejo Dusun Krajan berada di Jalan Lapangan No 88. SDN Sumberejo 04 memiliki fasilitas infrastruktur yang lengkap dengan berbagai kondisi yang bagus dan nyaman, serta menjadi salah satu SD Favorit di Desa Sumberejo karena torehan prestasi akademik dan non-akademik.",
    batasHarianDaftar: "100"
  };

  const collections = {
    Pengumuman: [
      {
        id: "ann-sumpah-pemuda-2026",
        judul: "PERINGATAN HARI SUMPAH PEMUDA",
        tanggal: "2026-10-28",
        kategori: "Kegiatan Sekolah",
        fotoUrl: "assets/img/pengumuman-sumpah-pemuda.svg",
        isi: "Diberitahukan kepada seluruh siswa-siswi dan orang tua/wali murid SDN Sumberejo 04, dalam rangka memperingati Hari Sumpah Pemuda pada tanggal 28 Oktober 2026, sekolah akan menyelenggarakan kegiatan dengan rincian sebagai berikut:\n\nHari, tanggal: Rabu, 28 Oktober 2026\nWaktu: Pukul 07.00 WIB – Selesai\nKegiatan: Upacara Bendera Peringatan Hari Sumpah Pemuda & Kegiatan Literasi/Kreativitas Siswa\nPakaian/Seragam: Pakaian Adat / Batik Sekolah / Seragam Pramuka\n\nDiharapkan seluruh siswa hadir tepat waktu dan mengikuti seluruh rangkaian kegiatan dengan tertib dan penuh semangat.",
        tampil: true
      },
      {
        id: "ann-pts-2026",
        judul: "Jadwal Penilaian Tengah Semester (PTS)",
        tanggal: "2026-10-25",
        kategori: "Akademik",
        fotoUrl: "assets/img/pengumuman-pts.svg",
        isi: "Diberitahukan kepada seluruh siswa-siswi, bahwa pelaksanaan Penilaian Tengah Semester (PTS) akan dilaksanakan pada tanggal 2 November – 7 November 2026. Mohon semua siswa mempersiapkan diri dengan baik dan belajar secara teratur. Jadwal mata pelajaran harian dapat dilihat melalui lembar informasi yang dibagikan wali kelas masing-masing.",
        tampil: true
      },
      {
        id: "ann-rapat-ortu-2026",
        judul: "Rapat Orang Tua Wali Murid",
        tanggal: "2026-10-22",
        kategori: "Orang Tua",
        fotoUrl: "assets/img/pengumuman-rapat-ortu.svg",
        isi: "Diberitahukan kepada seluruh orang tua/wali murid kelas 1–6 bahwa akan dilaksanakan Rapat Orang Tua/Wali Murid pada tanggal 30 Oktober 2026 pukul 08.00 WIB di ruang kelas masing-masing. Kehadiran Bapak/Ibu sangat kami harapkan guna membahas perkembangan kurikulum, pembinaan karakter, serta persiapan agenda semester berjalan.",
        tampil: true
      }
    ],
    Guru: [
      {
        id: "GUR-20261029-234141",
        nama: "SAMSUL ARIFIN, S.Pd",
        jabatan: "Kepala Sekolah",
        fotoUrl: "https://lh3.googleusercontent.com/d/1TlbVqCuEIaYKvwiSiO_6veO4wPNQ1zyO",
        urutan: 1,
        tampil: true
      },
      {
        id: "GUR-002",
        nama: "Siti Aminah, S.Pd.SD",
        jabatan: "Guru Kelas 1",
        fotoUrl: "",
        urutan: 2,
        tampil: true
      },
      {
        id: "GUR-003",
        nama: "Ahmad Rofi'i, S.Pd.SD",
        jabatan: "Guru Kelas 2 & Pembina Pramuka",
        fotoUrl: "",
        urutan: 3,
        tampil: true
      },
      {
        id: "GUR-004",
        nama: "Endang Sri Wahyuni, S.Pd.",
        jabatan: "Guru Kelas 3 & Koordinator Seni",
        fotoUrl: "",
        urutan: 4,
        tampil: true
      },
      {
        id: "GUR-005",
        nama: "Budi Hartono, S.Pd.SD",
        jabatan: "Guru Kelas 4",
        fotoUrl: "",
        urutan: 5,
        tampil: true
      },
      {
        id: "GUR-006",
        nama: "Dewi Ratnasari, S.Pd.",
        jabatan: "Guru Kelas 5",
        fotoUrl: "",
        urutan: 6,
        tampil: true
      },
      {
        id: "GUR-007",
        nama: "Wahyu Setiawan, S.Pd.SD",
        jabatan: "Guru Kelas 6",
        fotoUrl: "",
        urutan: 7,
        tampil: true
      },
      {
        id: "GUR-008",
        nama: "Imam Santoso, S.Pd.",
        jabatan: "Guru PJOK & Pembina Olahraga",
        fotoUrl: "",
        urutan: 8,
        tampil: true
      }
    ],
    Ekstrakurikuler: [
      {
        id: "EKS-001",
        nama: "Pramuka (Wajib)",
        deskripsi:
          "Melatih kemandirian, kedisiplinan, kerjasama tim, kecakapan bertahan hidup di alam, dan jiwa kepemimpinan.",
        pembina: "Ahmad Rofi'i, S.Pd.SD",
        jadwal: "Jumat, 13:30 - 15:00 WIB",
        fotoUrl: "",
        tampil: true
      },
      {
        id: "EKS-002",
        nama: "Seni Tari Tradisional",
        deskripsi:
          "Mengenalkan kekayaan seni budaya Nusantara, melatih kepekaan ritme, kelenturan gerak, dan rasa percaya diri siswa.",
        pembina: "Endang Sri Wahyuni, S.Pd.",
        jadwal: "Kamis, 13:30 - 15:00 WIB",
        fotoUrl: "",
        tampil: true
      },
      {
        id: "EKS-003",
        nama: "Klub Bulu Tangkis & Olahraga",
        deskripsi:
          "Mengasah keterampilan fisik, sportivitas, daya tahan tubuh, dan teknik dasar cabang olahraga prestasi.",
        pembina: "Imam Santoso, S.Pd.",
        jadwal: "Sabtu, 08:00 - 10:00 WIB",
        fotoUrl: "",
        tampil: true
      }
    ],
    Fasilitas: [
      {
        id: "FAS-001",
        nama: "Ruang Kelas Representatif",
        deskripsi:
          "Ruang kelas yang luas, ventilasi udara yang baik, pencahayaan alami cukup, serta dilengkapi papan tulis interaktif dan media pembelajaran.",
        fotoUrl: "",
        urutan: 1,
        tampil: true
      },
      {
        id: "FAS-002",
        nama: "Perpustakaan Ramah Anak",
        deskripsi:
          "Koleksi ribuan buku cerita, ensiklopedia anak, buku pelajaran tematik, dan area baca beralas karpet yang santai serta nyaman.",
        fotoUrl: "",
        urutan: 2,
        tampil: true
      },
      {
        id: "FAS-003",
        nama: "Lapangan Olahraga & Upacara",
        deskripsi:
          "Lapangan multifungsi beraspal halus untuk kegiatan senam pagi, upacara bendera hari Senin, bulu tangkis, voli, dan futsal mini.",
        fotoUrl: "",
        urutan: 3,
        tampil: true
      },
      {
        id: "FAS-004",
        nama: "Ruang UKS (Kesehatan)",
        deskripsi:
          "Fasilitas pertolongan pertama pada kecelakaan (P3K), tempat tidur istirahat, timbangan badan, alat ukur tinggi badan, dan pengawasan berkala Puskesmas.",
        fotoUrl: "",
        urutan: 4,
        tampil: true
      },
      {
        id: "FAS-005",
        nama: "Taman & Halaman Hijau",
        deskripsi:
          "Taman sekolah yang asri ditanami tanaman hias dan apotek hidup (TOGA), menciptakan udara sejuk sekaligus media belajar sains lingkungan.",
        fotoUrl: "",
        urutan: 5,
        tampil: true
      },
      {
        id: "FAS-006",
        nama: "Sanitasi & Toilet Bersih",
        deskripsi:
          "Toilet terpisah untuk siswa laki-laki, perempuan, dan guru dengan ketersediaan air bersih melimpah serta fasilitas cuci tangan bersabun.",
        fotoUrl: "",
        urutan: 6,
        tampil: true
      }
    ],
    Galeri: [
      {
        id: "GAL-001",
        judul: "Upacara Peringatan Hari Sumpah Pemuda",
        tanggal: "2026-10-28",
        tipe: "foto",
        url: "assets/img/pengumuman-sumpah-pemuda.svg",
        tampil: true
      },
      {
        id: "GAL-002",
        judul: "Kegiatan Literasi & Persiapan PTS",
        tanggal: "2026-10-25",
        tipe: "foto",
        url: "assets/img/pengumuman-pts.svg",
        tampil: true
      }
    ]
  };

  const pendaftarList = [
    {
      nomorPendaftaran: "SPMB-2026-0001",
      waktuDaftar: "2026-10-28 08:30:00",
      namaMurid: "Rizky Aditya Pratama",
      nik: "3509121505200001",
      tempatLahir: "Jember",
      tanggalLahir: "2020-05-15",
      jenisKelamin: "Laki-laki",
      namaOrtu: "Hendra Pratama",
      nikOrtu: "3509121001880002",
      hp: "081234567891",
      email: "hendra.pratama@example.com",
      alamat: "Dusun Krajan Kidul RT 02 RW 01 Desa Sumberejo, Kec. Ambulu, Jember",
      asalTk: "TK Pertiwi Sumberejo",
      linkKk: "assets/img/logo.svg",
      linkAkta: "assets/img/logo.svg",
      status: "baru",
      catatanAdmin: ""
    },
    {
      nomorPendaftaran: "SPMB-2026-0002",
      waktuDaftar: "2026-10-27 10:15:00",
      namaMurid: "Aisyah Putri Rahmawati",
      nik: "3509122208200003",
      tempatLahir: "Jember",
      tanggalLahir: "2020-08-22",
      jenisKelamin: "Perempuan",
      namaOrtu: "Slamet Raharjo",
      nikOrtu: "3509120504850004",
      hp: "081345678902",
      email: "slamet.raharjo@example.com",
      alamat: "Jl. Lapangan No. 42 Krajan Kidul, Sumberejo, Ambulu",
      asalTk: "RA Perwanida Sumberejo",
      linkKk: "assets/img/logo.svg",
      linkAkta: "assets/img/logo.svg",
      status: "diterima",
      catatanAdmin: "Berkas KK dan Akta lengkap dan sesuai."
    }
  ];

  const mediaList = [
    {
      id: "MED-001",
      fileId: "local-sumpah-pemuda",
      url: "/assets/img/pengumuman-sumpah-pemuda.svg",
      alt: "Banner Sumpah Pemuda",
      namaAsli: "pengumuman-sumpah-pemuda.svg",
      diunggah: "2026-10-28 07:00",
      oleh: "kepsek"
    },
    {
      id: "MED-002",
      fileId: "local-pts",
      url: "/assets/img/pengumuman-pts.svg",
      alt: "Banner PTS",
      namaAsli: "pengumuman-pts.svg",
      diunggah: "2026-10-25 08:00",
      oleh: "editor"
    },
    {
      id: "MED-003",
      fileId: "local-rapat-ortu",
      url: "/assets/img/pengumuman-rapat-ortu.svg",
      alt: "Banner Rapat Orang Tua",
      namaAsli: "pengumuman-rapat-ortu.svg",
      diunggah: "2026-10-22 09:00",
      oleh: "editor"
    }
  ];

  const users = [
    {
      id: "USR-001",
      namaPengguna: "kepsek",
      namaTampil: "Kepala Sekolah",
      peran: "superadmin",
      kataSandi: "admin12345",
      aktif: true,
      wajibGantiSandi: false
    },
    {
      id: "USR-002",
      namaPengguna: "editor",
      namaTampil: "Ibu Endang (Humas)",
      peran: "editor",
      kataSandi: "guru12345",
      aktif: true,
      wajibGantiSandi: false
    },
    {
      id: "USR-003",
      namaPengguna: "panitia",
      namaTampil: "Panitia SPMB",
      peran: "admin_spmb",
      kataSandi: "spmb12345",
      aktif: true,
      wajibGantiSandi: false
    }
  ];

  const logs = [
    {
      waktu: "2026-10-29 08:00:00",
      pengguna: "kepsek",
      aksi: "SYNC_GAS",
      modul: "Sistem",
      ringkasan: "Terhubung secara realtime dengan Google Apps Script & Google Sheets."
    }
  ];

  const sessions = new Map();
  const mediaFiles = new Map();

  function registerDataUrlAsMedia(dataUrl, fallbackName = "upload.jpg") {
    const str = String(dataUrl || "").trim();
    const match = str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return str;
    const mime = match[1] || "image/jpeg";
    const base64 = match[2] || "";
    const id = "MED-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const buffer = Buffer.from(base64, "base64");
    const shortUrl = `/api/media/${id}.jpg`;
    mediaFiles.set(id, {
      id,
      mime,
      buffer,
      base64,
      url: shortUrl,
      remoteUrl: null,
      namaAsli: fallbackName
    });
    return shortUrl;
  }

  function logActivity(pengguna, aksi, modul, ringkasan) {
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);
    logs.unshift({ waktu: now, pengguna, aksi, modul, ringkasan });
  }

  function normalizeRow(row) {
    if (!row || typeof row !== "object") return row;
    const copy = { ...row };
    if (copy.isi !== undefined && copy.isi !== null) copy.isi = String(copy.isi);
    if (copy.judul !== undefined && copy.judul !== null) copy.judul = String(copy.judul);
    if (copy.deskripsi !== undefined && copy.deskripsi !== null) copy.deskripsi = String(copy.deskripsi);
    if (copy.nama !== undefined && copy.nama !== null) copy.nama = String(copy.nama);
    if (copy.jabatan !== undefined && copy.jabatan !== null) copy.jabatan = String(copy.jabatan);

    const photoFields = ["fotoUrl", "bannerUrl", "foto", "gambar", "thumbnail", "url"];
    for (const f of photoFields) {
      if (copy[f] !== undefined && copy[f] !== null) {
        const val = String(copy[f]).trim();
        copy[f] = val.startsWith("data:image/") ? registerDataUrlAsMedia(val) : val;
      }
    }
    return copy;
  }

  function getPublicRows(sheetName) {
    const rows = collections[sheetName] || [];
    return rows
      .filter((r) => r.tampil === true || String(r.tampil).toUpperCase() === "TRUE")
      .map((r) => normalizeRow(r));
  }

  /**
   * Hydrate store from live Google Apps Script getSiteBundle / admin collections
   */
  function applyRemoteBundle(remote = {}) {
    if (remote.config && typeof remote.config === "object") {
      Object.entries(remote.config).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          config[k] = String(v);
        }
      });
    }
    const mapCol = [
      ["pengumuman", "Pengumuman"],
      ["guru", "Guru"],
      ["ekskul", "Ekstrakurikuler"],
      ["fasilitas", "Fasilitas"],
      ["galeri", "Galeri"]
    ];
    for (const [remKey, colName] of mapCol) {
      const arr = remote[remKey] || (remote.collections && remote.collections[colName]);
      if (Array.isArray(arr) && arr.length > 0) {
        collections[colName] = arr.map((item) => normalizeRow(item));
      }
    }
    if (Array.isArray(remote.pendaftar) && remote.pendaftar.length > 0) {
      pendaftarList.length = 0;
      remote.pendaftar.forEach((p) => pendaftarList.push({ ...p }));
    }
    if (Array.isArray(remote.media) && remote.media.length > 0) {
      mediaList.length = 0;
      remote.media.forEach((m) => mediaList.push({ ...m }));
    }
  }

  function applyRemoteCollection(sheetName, items) {
    if (collections[sheetName] && Array.isArray(items)) {
      collections[sheetName] = items.map((item) => normalizeRow(item));
    }
  }

  function handleGet(action, params = {}) {
    switch (action) {
      case "getSiteBundle":
        return {
          config: { ...config },
          pengumuman: handleGet("getPengumuman", { limit: 10 }),
          guru: handleGet("getGuru"),
          ekskul: handleGet("getEkskul"),
          fasilitas: handleGet("getFasilitas"),
          galeri: handleGet("getGaleri", { limit: 12 })
        };
      case "getSiteConfig":
        return { ...config };
      case "getPengumuman": {
        const limit = Math.max(1, parseInt(params.limit, 10) || 10);
        const rows = getPublicRows("Pengumuman");
        rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
        return rows.slice(0, limit);
      }
      case "getGuru": {
        const rows = getPublicRows("Guru");
        rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
        return rows;
      }
      case "getEkskul":
        return getPublicRows("Ekstrakurikuler");
      case "getFasilitas": {
        const rows = getPublicRows("Fasilitas");
        rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
        return rows;
      }
      case "getGaleri": {
        const limit = Math.max(1, parseInt(params.limit, 10) || 20);
        const rows = getPublicRows("Galeri");
        rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
        return rows.slice(0, limit);
      }
      case "cekStatus": {
        const nomor = String(params.nomor || "").trim().toUpperCase();
        if (!nomor) throw new Error("Nomor pendaftaran wajib disertakan.");
        const found = pendaftarList.find(
          (p) => String(p.nomorPendaftaran).trim().toUpperCase() === nomor
        );
        if (!found) {
          return { ditemukan: false, message: "Nomor pendaftaran tidak ditemukan." };
        }
        return {
          ditemukan: true,
          nomorPendaftaran: found.nomorPendaftaran,
          namaMurid: found.namaMurid,
          status: found.status || "diproses"
        };
      }
      default: {
        const err = new Error("Action tidak dikenal atau parameter kosong.");
        err.code = "BAD_REQUEST";
        throw err;
      }
    }
  }

  function handlePost(body = {}) {
    const action = body.action;
    if (!action) {
      const err = new Error("Parameter action wajib disertakan.");
      err.code = "BAD_REQUEST";
      throw err;
    }

    if (action === "submitPendaftaran") {
      if (body.honeypot && String(body.honeypot).trim() !== "") {
        return { nomorPendaftaran: "SPMB-0000", tanggal: new Date().toISOString() };
      }
      const data = body.data || {};
      if (!data.namaMurid || !/^\d{16}$/.test(String(data.nik || "").trim())) {
        const err = new Error("Data nama murid dan 16 digit NIK wajib valid.");
        err.code = "VALIDATION_ERROR";
        throw err;
      }

      const year = new Date().getFullYear();
      const nextNum = String(pendaftarList.length + 1).padStart(4, "0");
      const nomorPendaftaran = `SPMB-${year}-${nextNum}`;
      const waktuDaftar = new Date().toISOString().replace("T", " ").substring(0, 19);

      const newEntry = {
        nomorPendaftaran,
        waktuDaftar,
        namaMurid: String(data.namaMurid || "").trim(),
        nik: String(data.nik || "").trim(),
        tempatLahir: String(data.tempatLahir || "").trim(),
        tanggalLahir: String(data.tanggalLahir || "").trim(),
        jenisKelamin: String(data.jenisKelamin || "").trim(),
        namaOrtu: String(data.namaOrtu || "").trim(),
        nikOrtu: String(data.nikOrtu || "").trim(),
        hp: String(data.hp || "").trim(),
        email: String(data.email || "").trim(),
        alamat: String(data.alamat || "").trim(),
        asalTk: String(data.asalTk || "").trim(),
        linkKk: "assets/img/logo.svg",
        linkAkta: "assets/img/logo.svg",
        status: "baru",
        catatanAdmin: ""
      };
      pendaftarList.unshift(newEntry);
      logActivity("publik", "DAFTAR_SPMB", "Pendaftar", `Pendaftaran baru: ${nomorPendaftaran}`);
      return { nomorPendaftaran, tanggal: waktuDaftar };
    }

    if (action === "admin_firebase_login") {
      const email = String(body.email || "").trim().toLowerCase();
      const uid = String(body.uid || "").trim();
      const displayName = String(body.displayName || body.email || "Admin Firebase").trim();
      if (!email && !uid) {
        throw new Error("Kredensial Firebase tidak valid.");
      }
      const isBootstrapped = email === "bahanajarp@gmail.com";
      let matchedUser = users.find(
        (u) => (u.email && u.email.toLowerCase() === email) || (u.firebaseUid && u.firebaseUid === uid)
      );
      if (!matchedUser && isBootstrapped) {
        matchedUser = {
          id: "USR-FB-" + (uid ? uid.slice(0, 8) : "ADMIN"),
          namaPengguna: email.split("@")[0],
          email: email,
          firebaseUid: uid,
          namaTampil: displayName || "Admin Utama (Firebase)",
          peran: "superadmin",
          aktif: true,
          wajibGantiSandi: false
        };
        users.unshift(matchedUser);
      }
      if (!matchedUser) {
        matchedUser = users.find(
          (u) => u.namaPengguna.toLowerCase() === String(body.username || "").toLowerCase()
        );
      }
      if (!matchedUser || !matchedUser.aktif) {
        throw new Error("Akun Firebase (" + (email || uid) + ") belum terdaftar di daftar pengguna admin. Hubungi Superadmin.");
      }
      const token = crypto.randomUUID();
      const userData = {
        id: matchedUser.id,
        namaPengguna: matchedUser.namaPengguna,
        namaTampil: matchedUser.namaTampil,
        peran: matchedUser.peran,
        email: matchedUser.email || email,
        firebaseUid: uid,
        provider: "firebase"
      };
      sessions.set(token, { ...userData });
      logActivity(userData.namaPengguna, "LOGIN_FIREBASE", "Auth", `Masuk menggunakan Firebase Authentication (${email}).`);
      return { token, pengguna: userData };
    }

    if (action === "admin_login") {
      const cleanUser = String(body.namaPengguna || "").trim().toLowerCase();
      const password = String(body.kataSandi || "");
      if (!cleanUser || !password) {
        throw new Error("Nama pengguna dan kata sandi wajib diisi.");
      }
      const matched = users.find(
        (u) => (u.namaPengguna.toLowerCase() === cleanUser || (u.email && u.email.toLowerCase() === cleanUser)) && u.aktif && u.kataSandi === password
      );
      if (!matched) {
        throw new Error("Nama pengguna atau kata sandi salah.");
      }
      const token = crypto.randomUUID();
      const userData = {
        id: matched.id,
        namaPengguna: matched.namaPengguna,
        namaTampil: matched.namaTampil,
        peran: matched.peran,
        wajibGantiSandi: matched.wajibGantiSandi
      };
      sessions.set(token, { ...userData, kataSandi: password });
      logActivity(userData.namaPengguna, "LOGIN", "Auth", "Pengguna berhasil masuk panel CMS.");
      return { token, pengguna: userData };
    }

    const session = body.token ? sessions.get(body.token) : null;
    if (!session) {
      const err = new Error("Sesi telah berakhir atau tidak sah. Silakan masuk kembali.");
      err.code = "UNAUTHORIZED";
      throw err;
    }

    switch (action) {
      case "admin_me": {
        const { kataSandi, ...safeUser } = session;
        return { pengguna: safeUser };
      }
      case "admin_logout":
        sessions.delete(body.token);
        return { logout: true };
      case "admin_getBundle":
        return {
          config: { ...config },
          pendaftar:
            session.peran === "superadmin" || session.peran === "admin_spmb"
              ? pendaftarList.map((p) => ({ ...p }))
              : [],
          pengumumanCount: getPublicRows("Pengumuman").length,
          collections: {
            Pengumuman: collections.Pengumuman.map((r) => normalizeRow(r)),
            Guru: collections.Guru.map((r) => normalizeRow(r)),
            Ekstrakurikuler: collections.Ekstrakurikuler.map((r) => normalizeRow(r)),
            Fasilitas: collections.Fasilitas.map((r) => normalizeRow(r)),
            Galeri: collections.Galeri.map((r) => normalizeRow(r))
          }
        };
      case "admin_saveKonten": {
        if (session.peran === "admin_spmb") {
          throw new Error("Anda tidak memiliki hak akses mengubah konten.");
        }
        const items = Array.isArray(body.items) ? body.items : [];
        items.forEach((item) => {
          if (item && item.kunci) {
            config[String(item.kunci).trim()] = item.nilai;
          }
        });
        logActivity(
          session.namaPengguna,
          "UBAH_KONTEN",
          "Pengaturan",
          `Memperbarui ${items.length} data pengaturan.`
        );
        return { saved: items.length, config: { ...config } };
      }
      case "admin_updatePendaftar": {
        if (session.peran === "editor") {
          throw new Error("Editor konten tidak berwenang memverifikasi pendaftar.");
        }
        const target = pendaftarList.find(
          (p) =>
            String(p.nomorPendaftaran).trim().toUpperCase() ===
            String(body.nomorPendaftaran || "").trim().toUpperCase()
        );
        if (!target) {
          throw new Error("Nomor pendaftaran tidak ditemukan.");
        }
        target.status = body.status || target.status;
        target.catatanAdmin = body.catatanAdmin !== undefined ? body.catatanAdmin : target.catatanAdmin;
        logActivity(
          session.namaPengguna,
          "VERIFIKASI_SPMB",
          "Pendaftar",
          `Ubah status ${target.nomorPendaftaran} ke: ${target.status}`
        );
        return { success: true };
      }
      case "admin_uploadMedia": {
        if (session.peran === "admin_spmb") {
          throw new Error("Admin SPMB tidak memiliki akses mengunggah media situs.");
        }
        const berkas = body.berkas || {};
        const id = "MED-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
        const rawBase64 = String(berkas.base64 || "").includes(",")
          ? String(berkas.base64).split(",")[1]
          : String(berkas.base64 || "");
        const mime = berkas.mime || "image/jpeg";
        const buffer = Buffer.from(rawBase64, "base64");
        const shortUrl = `/api/media/${id}.jpg`;

        mediaFiles.set(id, {
          id,
          mime,
          buffer,
          base64: rawBase64,
          url: shortUrl,
          remoteUrl: null,
          namaAsli: berkas.nama || "upload.jpg"
        });

        const item = {
          id,
          fileId: id,
          url: shortUrl,
          alt: body.alt || berkas.nama || "Media",
          namaAsli: berkas.nama || "upload.jpg",
          diunggah: new Date().toISOString().replace("T", " ").substring(0, 16),
          oleh: session.namaPengguna
        };
        mediaList.unshift(item);
        logActivity(session.namaPengguna, "UNGGAH_FOTO", "Media", `Unggah foto ${item.namaAsli}`);
        return { id, url: shortUrl, fileId: id };
      }
      case "admin_listMedia":
        return mediaList.map((m) => ({ ...m }));
      case "admin_getCollection": {
        const sheetName = body.sheetName;
        const allowed = ["Pengumuman", "Guru", "Ekstrakurikuler", "Fasilitas", "Galeri"];
        if (!allowed.includes(sheetName)) {
          throw new Error("Koleksi tidak diizinkan: " + sheetName);
        }
        return (collections[sheetName] || []).map((r) => normalizeRow(r));
      }
      case "admin_saveRow": {
        if (session.peran === "admin_spmb") {
          throw new Error("Admin SPMB tidak memiliki akses mengubah koleksi ini.");
        }
        const sheetName = body.sheetName;
        const allowed = ["Pengumuman", "Guru", "Ekstrakurikuler", "Fasilitas", "Galeri"];
        if (!allowed.includes(sheetName)) {
          throw new Error("Koleksi tidak valid: " + sheetName);
        }
        const data = normalizeRow({ ...(body.data || {}) });
        const list = collections[sheetName];
        let rowId = data.id ? String(data.id).trim() : "";
        const existingIdx = rowId ? list.findIndex((r) => String(r.id).trim() === rowId) : -1;

        if (existingIdx === -1) {
          rowId = sheetName.substring(0, 3).toUpperCase() + "-" + Date.now();
          data.id = rowId;
          if (data.tampil === undefined) data.tampil = true;
          list.unshift(data);
          logActivity(
            session.namaPengguna,
            "TAMBAH_" + sheetName.toUpperCase(),
            sheetName,
            `Menambah data ID: ${rowId}`
          );
        } else {
          list[existingIdx] = normalizeRow({ ...list[existingIdx], ...data, id: rowId });
          logActivity(
            session.namaPengguna,
            "UBAH_" + sheetName.toUpperCase(),
            sheetName,
            `Mengubah data ID: ${rowId}`
          );
        }
        return { success: true, id: rowId, data: list[existingIdx === -1 ? 0 : existingIdx] };
      }
      case "admin_deleteRow": {
        if (session.peran === "admin_spmb") {
          throw new Error("Admin SPMB tidak memiliki akses menghapus data ini.");
        }
        const sheetName = body.sheetName;
        const list = collections[sheetName];
        if (!list) throw new Error("Sheet tidak ditemukan: " + sheetName);
        const idx = list.findIndex((r) => String(r.id).trim() === String(body.id || "").trim());
        if (idx === -1) throw new Error("Data ID tidak ditemukan.");
        list.splice(idx, 1);
        logActivity(
          session.namaPengguna,
          "HAPUS_" + sheetName.toUpperCase(),
          sheetName,
          `Menghapus data ID: ${body.id}`
        );
        return { success: true, id: body.id };
      }
      case "admin_toggleRow": {
        if (session.peran === "admin_spmb") {
          throw new Error("Admin SPMB tidak memiliki akses.");
        }
        const sheetName = body.sheetName;
        const list = collections[sheetName];
        if (!list) throw new Error("Sheet tidak ditemukan: " + sheetName);
        const item = list.find((r) => String(r.id).trim() === String(body.id || "").trim());
        if (!item) throw new Error("Data ID tidak ditemukan.");
        item.tampil = Boolean(body.tampil);
        return { success: true, id: body.id, tampil: item.tampil };
      }
      case "admin_uploadVideo": {
        if (session.peran === "admin_spmb") {
          throw new Error("Admin SPMB tidak memiliki akses.");
        }
        const id = "VID-" + Date.now();
        const url = "assets/video/opening.mp4";
        logActivity(session.namaPengguna, "UNGGAH_VIDEO", "Galeri", `Unggah video ${body.judul || id}`);
        return { id, url, fileId: id };
      }
      case "admin_listUsers": {
        if (session.peran !== "superadmin") {
          throw new Error("Hanya Superadmin yang berwenang melihat pengguna.");
        }
        return users.map(({ kataSandi, ...rest }) => ({ ...rest }));
      }
      case "admin_saveUser": {
        if (session.peran !== "superadmin") {
          throw new Error("Hanya Superadmin yang berwenang mengelola pengguna.");
        }
        const data = body.data || {};
        const namaPengguna = String(data.namaPengguna || "").trim().toLowerCase();
        const namaTampil = String(data.namaTampil || "").trim();
        const peran = data.peran || "editor";
        if (!namaPengguna || !namaTampil) {
          throw new Error("Nama pengguna dan nama tampilan wajib diisi.");
        }
        const existingIdx = data.id
          ? users.findIndex((u) => u.id === data.id)
          : users.findIndex((u) => u.namaPengguna.toLowerCase() === namaPengguna);

        const email = data.email ? String(data.email).trim().toLowerCase() : "";
        const firebaseUid = data.firebaseUid ? String(data.firebaseUid).trim() : "";

        if (existingIdx === -1) {
          const id = "USR-" + String(users.length + 1).padStart(3, "0");
          users.push({
            id,
            namaPengguna,
            namaTampil,
            email,
            firebaseUid,
            peran,
            kataSandi: data.kataSandi ? String(data.kataSandi) : "admin12345",
            aktif: data.aktif !== undefined ? Boolean(data.aktif) : true,
            wajibGantiSandi: false
          });
          logActivity(session.namaPengguna, "TAMBAH_USER", "PenggunaAdmin", `Menambah akun: ${namaPengguna}`);
          return { success: true, id };
        } else {
          const target = users[existingIdx];
          target.namaPengguna = namaPengguna;
          target.namaTampil = namaTampil;
          target.peran = peran;
          if (email) target.email = email;
          if (firebaseUid) target.firebaseUid = firebaseUid;
          if (data.kataSandi && String(data.kataSandi).trim() !== "") {
            target.kataSandi = String(data.kataSandi).trim();
          }
          if (data.aktif !== undefined) {
            target.aktif = Boolean(data.aktif);
          }
          logActivity(session.namaPengguna, "UBAH_USER", "PenggunaAdmin", `Mengubah akun: ${namaPengguna}`);
          return { success: true, id: target.id };
        }
      }
      case "admin_listLog": {
        if (session.peran !== "superadmin") {
          throw new Error("Hanya Superadmin yang berwenang memeriksa log.");
        }
        return logs.slice(0, 50);
      }
      default: {
        const err = new Error("Action admin tidak dikenal: " + action);
        err.code = "BAD_REQUEST";
        throw err;
      }
    }
  }

  function getSession(token) {
    return token ? sessions.get(token) : null;
  }

  function getMediaFile(rawId) {
    const cleanId = String(rawId || "").replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
    return mediaFiles.get(cleanId) || null;
  }

  function updateMediaRemoteUrl(localUrl, remoteDriveUrl) {
    if (!localUrl || !remoteDriveUrl) return;
    const cleanId = String(localUrl)
      .replace(/^\/api\/media\//, "")
      .replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
    const mf = mediaFiles.get(cleanId);
    if (mf) {
      mf.remoteUrl = remoteDriveUrl;
    }
    const mediaItem = mediaList.find((m) => m.id === cleanId || m.url === localUrl);
    if (mediaItem) {
      mediaItem.remoteUrl = remoteDriveUrl;
    }
  }

  return {
    handleGet,
    handlePost,
    applyRemoteBundle,
    applyRemoteCollection,
    getSession,
    getMediaFile,
    updateMediaRemoteUrl
  };
}

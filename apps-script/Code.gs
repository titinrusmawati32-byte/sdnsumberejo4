/**
 * GOOGLE APPS SCRIPT - BACKEND UTAMA SD NEGERI SUMBEREJO
 * Mendukung Situs Publik & Admin Panel (CMS) Terpadu
 * Sesuai spesifikasi PRD.md, API.md, dan PRD-CMS.md
 */

function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

var _cachedSs = null;

function getSpreadsheet() {
  if (_cachedSs) return _cachedSs;
  let sheetId = getProperty("SHEET_ID");
  if (sheetId && !sheetId.includes("MASUKKAN_ID")) {
    try {
      _cachedSs = SpreadsheetApp.openById(sheetId);
      return _cachedSs;
    } catch (e) {}
  }

  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      PropertiesService.getScriptProperties().setProperty("SHEET_ID", active.getId());
      _cachedSs = active;
      return _cachedSs;
    }
  } catch (e) {}

  try {
    const newSs = SpreadsheetApp.create("SDN Sumberejo 04 - Database");
    PropertiesService.getScriptProperties().setProperty("SHEET_ID", newSs.getId());
    _cachedSs = newSs;
    return _cachedSs;
  } catch (err) {
    throw new Error("Gagal membuka/membuat spreadsheet: " + err.message);
  }
}

function getSpmbFolder() {
  let folderId = getProperty("FOLDER_SPMB_ID");
  if (folderId && !folderId.includes("MASUKKAN_ID")) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }

  try {
    const newFolder = DriveApp.createFolder("SPMB SD Negeri Sumberejo");
    PropertiesService.getScriptProperties().setProperty("FOLDER_SPMB_ID", newFolder.getId());
    return newFolder;
  } catch (err) {
    throw new Error("Gagal membuka/membuat folder SPMB: " + err.message);
  }
}

function getPublicContentFolder() {
  let folderId = getProperty("FOLDER_KONTEN_ID");
  if (folderId && !folderId.includes("MASUKKAN_ID")) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }

  try {
    const newFolder = DriveApp.createFolder("Konten Publik SDN Sumberejo");
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    PropertiesService.getScriptProperties().setProperty("FOLDER_KONTEN_ID", newFolder.getId());
    return newFolder;
  } catch (err) {
    return getSpmbFolder();
  }
}

// ==========================================
// ROUTER GET (SITUS PUBLIK)
// ==========================================
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : "";
    switch (action) {
      case "getSiteBundle":
        return ok(getSiteBundle());
      case "getSiteConfig":
        return ok(getSiteConfig());
      case "getPengumuman":
        return ok(getPengumuman(e.parameter.limit));
      case "getGuru":
        return ok(getGuru());
      case "getEkskul":
        return ok(getEkskul());
      case "getFasilitas":
        return ok(getFasilitas());
      case "getGaleri":
        return ok(getGaleri(e.parameter.limit));
      case "cekStatus":
        return ok(cekStatus(e.parameter.nomor));
      default:
        return fail("BAD_REQUEST", "Action tidak dikenal atau parameter kosong.");
    }
  } catch (err) {
    Logger.log("doGet Error: " + err.toString());
    return fail("INTERNAL_ERROR", "Terjadi kesalahan di server: " + err.message);
  }
}

// ==========================================
// ROUTER POST (PENDAFTARAN & CMS ADMIN)
// ==========================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return fail("BAD_REQUEST", "Konten permintaan tidak ditemukan.");
    }
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Aksi Publik
    if (action === "submitPendaftaran") {
      return ok(submitPendaftaran(body), "Pendaftaran berhasil. Simpan nomor pendaftaran Anda.");
    }

    // Aksi Autentikasi Admin
    if (action === "admin_login") {
      return ok(adminLogin(body.namaPengguna, body.kataSandi));
    }

    // Aksi Admin Terproteksi Token
    const session = verifyAdminSession(body.token);
    if (!session) {
      return fail("UNAUTHORIZED", "Sesi telah berakhir atau tidak sah. Silakan masuk kembali.");
    }

    switch (action) {
      case "admin_me":
        return ok({ pengguna: session });
      case "admin_logout":
        return ok(adminLogout(body.token));
      case "admin_getBundle":
        return ok(adminGetBundle(session));
      case "admin_saveKonten":
        return ok(adminSaveKonten(body.items, session));
      case "admin_updatePendaftar":
        return ok(adminUpdatePendaftar(body.nomorPendaftaran, body.status, body.catatanAdmin, session));
      case "admin_uploadMedia":
        return ok(adminUploadMedia(body.berkas, body.alt, session));
      case "admin_listMedia":
        return ok(getPublicRowsFromSheet("Media"));
      case "admin_getCollection":
        return ok(adminGetCollection(body.sheetName, session));
      case "admin_saveRow":
        return ok(adminSaveRow(body.sheetName, body.data, session));
      case "admin_deleteRow":
        return ok(adminDeleteRow(body.sheetName, body.id, session));
      case "admin_toggleRow":
        return ok(adminToggleRow(body.sheetName, body.id, body.tampil, session));
      case "admin_uploadVideo":
        return ok(adminUploadVideo(body.berkas, body.judul, session));
      case "admin_listUsers":
        return ok(adminListUsers(session));
      case "admin_listLog":
        return ok(adminListLog(session));
      default:
        return fail("BAD_REQUEST", "Action admin tidak dikenal: " + action);
    }
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return fail("INTERNAL_ERROR", err.message || "Terjadi kesalahan internal server.");
  }
}

// ==========================================
// AUTENTIKASI & SESI CMS (HMAC-SHA-256 + CACHE)
// ==========================================

function adminLogin(username, password) {
  if (!username || !password) {
    throw new Error("Nama pengguna dan kata sandi wajib diisi.");
  }

  const cleanUser = String(username).trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const lockKey = "lockout_" + cleanUser;
  if (cache.get(lockKey)) {
    throw new Error("Akun dikunci sementara karena 5 kali kegagalan login. Silakan tunggu 15 menit.");
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("PenggunaAdmin");
  if (!sheet) throw new Error("Tabel PenggunaAdmin belum diinisialisasi.");

  const values = sheet.getDataRange().getValues();
  let userRow = null;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]).trim().toLowerCase() === cleanUser) {
      userRow = values[i];
      break;
    }
  }

  const failKey = "fail_login_" + cleanUser;
  const currentFails = parseInt(cache.get(failKey) || "0", 10);

  if (!userRow || userRow[5] === false) {
    // 5 kali gagal -> kunci 15 menit
    if (currentFails + 1 >= 5) {
      cache.put(lockKey, "1", 900); // 15 menit
      cache.remove(failKey);
    } else {
      cache.put(failKey, String(currentFails + 1), 900);
    }
    throw new Error("Nama pengguna atau kata sandi salah.");
  }

  // Verifikasi Hash Password
  const storedHash = String(userRow[4]);
  const isMatch = verifyPassword(password, storedHash);
  if (!isMatch) {
    if (currentFails + 1 >= 5) {
      cache.put(lockKey, "1", 900);
      cache.remove(failKey);
    } else {
      cache.put(failKey, String(currentFails + 1), 900);
    }
    throw new Error("Nama pengguna atau kata sandi salah.");
  }

  // Login Sukses: reset counter gagal & terbitkan token UUID sesi
  cache.remove(failKey);
  const token = Utilities.getUuid();
  const userData = {
    id: userRow[0],
    namaPengguna: userRow[1],
    namaTampil: userRow[2],
    peran: userRow[3],
    wajibGantiSandi: userRow[6] === true
  };

  // Simpan sesi di CacheService selama 6 jam (21600 detik)
  cache.put("session_" + token, JSON.stringify(userData), 21600);
  logActivity(userData.namaPengguna, "LOGIN", "Auth", "Pengguna berhasil masuk panel CMS.");

  return {
    token: token,
    pengguna: userData
  };
}

function verifyAdminSession(token) {
  if (!token) return null;
  const cached = CacheService.getScriptCache().get("session_" + token);
  if (!cached) return null;
  return JSON.parse(cached);
}

function adminLogout(token) {
  if (token) {
    CacheService.getScriptCache().remove("session_" + token);
  }
  return { logout: true };
}

function hashPassword(password) {
  const salt = Utilities.getUuid().substring(0, 16);
  let hash = password;
  for (let i = 0; i < 1000; i++) {
    const raw = Utilities.computeHmacSha256Signature(hash, salt);
    hash = Utilities.base64Encode(raw);
  }
  return salt + "$" + hash;
}

function verifyPassword(password, storedValue) {
  const parts = storedValue.split("$");
  if (parts.length !== 2) {
    // Fallback password sederhana jika belum di-hash
    return password === storedValue;
  }
  const salt = parts[0];
  const expectedHash = parts[1];
  let hash = password;
  for (let i = 0; i < 1000; i++) {
    const raw = Utilities.computeHmacSha256Signature(hash, salt);
    hash = Utilities.base64Encode(raw);
  }
  return hash === expectedHash;
}

// ==========================================
// LOGIKA BUNDLE PUBLIK & CMS
// ==========================================

function getSiteBundle() {
  return {
    config: getSiteConfig(),
    pengumuman: getPengumuman(5),
    guru: getGuru(),
    ekskul: getEkskul(),
    fasilitas: getFasilitas(),
    galeri: getGaleri(12)
  };
}

function getSiteConfig() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0]).trim();
    let val = values[i][1];
    if (val instanceof Date) {
      val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
    }
    if (key) {
      config[key] = val !== undefined ? val : "";
    }
  }
  return config;
}

function adminGetBundle(session) {
  const ss = getSpreadsheet();
  const config = getFullConfigMap();

  let pendaftar = [];
  if (session.peran === "superadmin" || session.peran === "admin_spmb") {
    const pSheet = ss.getSheetByName("Pendaftar");
    if (pSheet && pSheet.getLastRow() > 1) {
      const pVals = pSheet.getDataRange().getValues();
      const pHeaders = pVals[0].map(h => String(h).trim());
      for (let i = pVals.length - 1; i >= 1; i--) {
        const obj = {};
        pHeaders.forEach((h, col) => {
          let v = pVals[i][col];
          if (v instanceof Date) v = Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd HH:mm");
          obj[h] = v !== undefined ? String(v).replace(/^'/, "") : "";
        });
        pendaftar.push(obj);
      }
    }
  }

  const collections = {
    Pengumuman: adminGetCollection("Pengumuman", session),
    Guru: adminGetCollection("Guru", session),
    Ekstrakurikuler: adminGetCollection("Ekstrakurikuler", session),
    Fasilitas: adminGetCollection("Fasilitas", session),
    Galeri: adminGetCollection("Galeri", session)
  };

  return {
    config: config,
    pendaftar: pendaftar,
    pengumumanCount: collections.Pengumuman.filter(function(x) { return x.tampil === true || String(x.tampil).toUpperCase() === "TRUE"; }).length,
    collections: collections
  };
}

function adminSaveKonten(items, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Anda tidak memiliki hak akses mengubah konten.");
  }
  if (!Array.isArray(items) || items.length === 0) return { saved: 0 };

  const ss = getSpreadsheet();
  const pSheet = ss.getSheetByName("Pengaturan");
  if (!pSheet) throw new Error("Sheet Pengaturan tidak ditemukan.");

  const pVals = pSheet.getDataRange().getValues();
  const keyMap = {};
  for (let i = 1; i < pVals.length; i++) {
    keyMap[String(pVals[i][0]).trim()] = i + 1; // baris ke-(i+1)
  }

  items.forEach(item => {
    const k = String(item.kunci).trim();
    const v = item.nilai;
    if (keyMap[k]) {
      pSheet.getRange(keyMap[k], 2).setValue(v);
    } else {
      pSheet.appendRow([k, v]);
    }
  });

  SpreadsheetApp.flush(); // Komit langsung ke Google Sheets seketika tanpa delay

  logActivity(session.namaPengguna, "UBAH_KONTEN", "Pengaturan", `Memperbarui ${items.length} data pengaturan.`);
  return { saved: items.length };
}

function adminUpdatePendaftar(nomor, status, catatan, session) {
  if (session.peran === "editor") {
    throw new Error("Editor konten tidak berwenang memverifikasi pendaftar.");
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pendaftar");
  if (!sheet) throw new Error("Sheet Pendaftar tidak ditemukan.");

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h).trim());
  const nomIdx = headers.indexOf("nomorPendaftaran");
  const statIdx = headers.indexOf("status");
  const catIdx = headers.indexOf("catatanAdmin");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][nomIdx]).trim().toUpperCase() === String(nomor).trim().toUpperCase()) {
      sheet.getRange(i + 1, statIdx + 1).setValue(status);
      if (catIdx !== -1) {
        sheet.getRange(i + 1, catIdx + 1).setValue(catatan || "");
      }
      SpreadsheetApp.flush();
      logActivity(session.namaPengguna, "VERIFIKASI_SPMB", "Pendaftar", `Ubah status ${nomor} ke: ${status}`);
      return { success: true };
    }
  }
  throw new Error("Nomor pendaftaran tidak ditemukan.");
}

function adminUploadMedia(berkas, alt, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Admin SPMB tidak memiliki akses mengunggah media situs.");
  }

  const folder = getPublicContentFolder();
  const id = "MED-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
  const fileName = id + "_" + berkas.nama;
  const decoded = Utilities.base64Decode(berkas.base64);
  const blob = Utilities.newBlob(decoded, berkas.mime, fileName);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const directUrl = `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`;

  const ss = getSpreadsheet();
  let mSheet = ss.getSheetByName("Media");
  if (!mSheet) {
    mSheet = ss.insertSheet("Media");
    mSheet.appendRow(["id", "fileId", "url", "alt", "namaAsli", "diunggah", "oleh"]);
  }

  mSheet.appendRow([
    id, file.getId(), directUrl, alt || berkas.nama, berkas.nama,
    Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm"),
    session.namaPengguna
  ]);

  logActivity(session.namaPengguna, "UNGGAH_FOTO", "Media", `Unggah foto ${berkas.nama}`);

  return {
    id: id,
    url: directUrl,
    fileId: file.getId()
  };
}

function adminListUsers(session) {
  if (session.peran !== "superadmin") {
    throw new Error("Hanya Superadmin yang berwenang melihat pengguna.");
  }
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("PenggunaAdmin");
  if (!sheet) return [];

  const vals = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < vals.length; i++) {
    users.push({
      id: vals[i][0],
      namaPengguna: vals[i][1],
      namaTampil: vals[i][2],
      peran: vals[i][3],
      aktif: vals[i][5] === true
    });
  }
  return users;
}

function adminListLog(session) {
  if (session.peran !== "superadmin") {
    throw new Error("Hanya Superadmin yang berwenang memeriksa log.");
  }
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Log");
  if (!sheet) return [];

  const vals = sheet.getDataRange().getValues();
  const logs = [];
  for (let i = vals.length - 1; i >= Math.max(1, vals.length - 50); i--) {
    logs.push({
      waktu: vals[i][0],
      pengguna: vals[i][1],
      aksi: vals[i][2],
      modul: vals[i][3],
      ringkasan: vals[i][4]
    });
  }
  return logs;
}

function logActivity(user, aksi, modul, ringkasan) {
  try {
    const ss = getSpreadsheet();
    let lSheet = ss.getSheetByName("Log");
    if (!lSheet) {
      lSheet = ss.insertSheet("Log");
      lSheet.appendRow(["waktu", "pengguna", "aksi", "modul", "ringkasan"]);
    }
    lSheet.appendRow([
      Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss"),
      user, aksi, modul, ringkasan
    ]);
  } catch (e) {}
}

function adminGetCollection(sheetName, session) {
  const allowed = ["Pengumuman", "Guru", "Ekstrakurikuler", "Fasilitas", "Galeri"];
  if (!allowed.includes(sheetName)) {
    throw new Error("Koleksi tidak diizinkan: " + sheetName);
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const results = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
      }
      obj[h] = val !== undefined ? val : "";
    });
    results.push(obj);
  }

  if (headers.includes("urutan")) {
    results.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
  } else if (headers.includes("tanggal")) {
    results.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  }

  return results;
}

function adminSaveRow(sheetName, data, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Admin SPMB tidak memiliki akses mengubah koleksi ini.");
  }
  const allowed = ["Pengumuman", "Guru", "Ekstrakurikuler", "Fasilitas", "Galeri"];
  if (!allowed.includes(sheetName)) throw new Error("Koleksi tidak valid: " + sheetName);

  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet tidak ditemukan: " + sheetName);

  const values = sheet.getDataRange().getValues();
  let headers = values[0].map(h => String(h).trim());

  // Pastikan kolom fotoUrl dan kategori otomatis dibuat jika belum ada di sheet
  if (data.fotoUrl !== undefined && !headers.includes("fotoUrl")) {
    sheet.getRange(1, headers.length + 1).setValue("fotoUrl");
    headers.push("fotoUrl");
  }
  if (data.kategori !== undefined && !headers.includes("kategori")) {
    sheet.getRange(1, headers.length + 1).setValue("kategori");
    headers.push("kategori");
  }

  const idColIdx = headers.indexOf("id");

  let targetRowIdx = -1;
  let rowId = data.id;

  if (rowId) {
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idColIdx]).trim() === String(rowId).trim()) {
        targetRowIdx = i + 1;
        break;
      }
    }
  }

  if (targetRowIdx === -1) {
    rowId = sheetName.substring(0, 3).toUpperCase() + "-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
    data.id = rowId;
    if (data.tampil === undefined) data.tampil = true;

    const newRow = headers.map(h => {
      return data[h] !== undefined ? data[h] : "";
    });

    sheet.appendRow(newRow);
    logActivity(session.namaPengguna, "TAMBAH_" + sheetName.toUpperCase(), sheetName, `Menambah data ID: ${rowId}`);
  } else {
    headers.forEach((h, colIdx) => {
      if (h !== "id" && data[h] !== undefined) {
        sheet.getRange(targetRowIdx, colIdx + 1).setValue(data[h]);
      }
    });
    logActivity(session.namaPengguna, "UBAH_" + sheetName.toUpperCase(), sheetName, `Mengubah data ID: ${rowId}`);
  }

  SpreadsheetApp.flush();
  return { success: true, id: rowId, data: data };
}

function adminDeleteRow(sheetName, id, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Admin SPMB tidak memiliki akses menghapus data ini.");
  }
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet tidak ditemukan: " + sheetName);

  const values = sheet.getDataRange().getValues();
  let headers = values[0].map(h => String(h).trim());
  const idColIdx = headers.indexOf("id");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      logActivity(session.namaPengguna, "HAPUS_" + sheetName.toUpperCase(), sheetName, `Menghapus data ID: ${id}`);
      return { success: true, id: id };
    }
  }
  throw new Error("Data ID tidak ditemukan.");
}

function adminToggleRow(sheetName, id, tampil, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Admin SPMB tidak memiliki akses.");
  }
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet tidak ditemukan: " + sheetName);

  const values = sheet.getDataRange().getValues();
  let headers = values[0].map(h => String(h).trim());
  const idColIdx = headers.indexOf("id");
  const tampilColIdx = headers.indexOf("tampil");

  if (tampilColIdx === -1) throw new Error("Kolom tampil tidak ditemukan.");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]).trim() === String(id).trim()) {
      sheet.getRange(i + 1, tampilColIdx + 1).setValue(Boolean(tampil));
      SpreadsheetApp.flush();
      return { success: true, id: id, tampil: Boolean(tampil) };
    }
  }
  throw new Error("Data ID tidak ditemukan.");
}

function adminUploadVideo(berkas, judul, session) {
  if (session.peran === "admin_spmb") {
    throw new Error("Admin SPMB tidak memiliki akses.");
  }
  const folder = getPublicContentFolder();
  const id = "VID-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd-HHmmss");
  const fileName = id + "_" + (berkas.nama || "video.mp4");
  const decoded = Utilities.base64Decode(berkas.base64);
  const blob = Utilities.newBlob(decoded, berkas.mime || "video/mp4", fileName);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const directUrl = `https://drive.google.com/file/d/${file.getId()}/preview`;

  logActivity(session.namaPengguna, "UNGGAH_VIDEO", "Galeri", `Unggah video ${berkas.nama}`);

  return {
    id: id,
    url: directUrl,
    fileId: file.getId()
  };
}

// ==========================================
// KOLEKSI PUBLIK (GURU, PENGUMUMAN, DLL)
// ==========================================

function getPengumuman(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 10);
  const rows = getPublicRowsFromSheet("Pengumuman");
  rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  return rows.slice(0, limit);
}

function getGuru() {
  const rows = getPublicRowsFromSheet("Guru");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
  return rows;
}

function getEkskul() {
  return getPublicRowsFromSheet("Ekstrakurikuler");
}

function getFasilitas() {
  const rows = getPublicRowsFromSheet("Fasilitas");
  rows.sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999));
  return rows;
}

function getGaleri(limitParam) {
  const limit = Math.max(1, parseInt(limitParam, 10) || 20);
  const rows = getPublicRowsFromSheet("Galeri");
  rows.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
  return rows.slice(0, limit);
}

function cekStatus(nomor) {
  if (!nomor) throw new Error("Nomor pendaftaran wajib disertakan.");
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pendaftar");
  if (!sheet) return { ditemukan: false };

  const vals = sheet.getDataRange().getValues();
  const headers = vals[0].map(h => String(h).trim());
  const nomIdx = headers.indexOf("nomorPendaftaran");
  const statIdx = headers.indexOf("status");
  const namaIdx = headers.indexOf("namaMurid");

  for (let i = 1; i < vals.length; i++) {
    if (String(vals[i][nomIdx]).trim().toUpperCase() === String(nomor).trim().toUpperCase()) {
      return {
        ditemukan: true,
        nomorPendaftaran: vals[i][nomIdx],
        namaMurid: vals[i][namaIdx],
        status: vals[i][statIdx] || "diproses"
      };
    }
  }
  return { ditemukan: false, message: "Nomor pendaftaran tidak ditemukan." };
}

function getPublicRowsFromSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0].map(h => String(h).trim());
  const tampilIdx = headers.indexOf("tampil");

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (tampilIdx !== -1) {
      const isTampil = row[tampilIdx] === true || String(row[tampilIdx]).toUpperCase() === "TRUE";
      if (!isTampil) continue;
    }

    const obj = {};
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
      }
      obj[h] = val !== undefined ? val : "";
    });
    results.push(obj);
  }
  return results;
}

function getFullConfigMap() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Pengaturan");
  if (!sheet) return {};

  const values = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const k = String(values[i][0]).trim();
    let v = values[i][1];
    if (v instanceof Date) {
      v = Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
    }
    map[k] = v;
  }
  return map;
}

// ==========================================
// PENDAFTARAN SPMB
// ==========================================

function submitPendaftaran(body) {
  if (body.honeypot && String(body.honeypot).trim() !== "") {
    return { nomorPendaftaran: "SPMB-0000", tanggal: new Date().toISOString() };
  }

  const data = body.data || {};
  const berkas = body.berkas || [];

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000);
  if (!hasLock) throw new Error("INTERNAL_ERROR: Server sedang sibuk. Coba sesaat lagi.");

  const uploadedFiles = [];
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Pendaftar");
    if (!sheet) throw new Error("Sheet Pendaftar tidak ditemukan.");

    const existingValues = sheet.getDataRange().getValues();
    const now = new Date();
    const tahun = now.getFullYear();
    const totalPendaftar = existingValues.length;
    const nomorUrut = ("0000" + totalPendaftar).slice(-4);
    const nomorPendaftaran = `SPMB-${tahun}-${nomorUrut}`;

    const spmbFolder = getSpmbFolder();
    let linkKk = "";
    let linkAkta = "";

    berkas.forEach(b => {
      const extension = b.mime === "application/pdf" ? "pdf" : (b.mime === "image/png" ? "png" : "jpg");
      const fileName = `${nomorPendaftaran}_${b.field}.${extension}`;
      const decodedBytes = Utilities.base64Decode(b.base64);
      const blob = Utilities.newBlob(decodedBytes, b.mime, fileName);
      const file = spmbFolder.createFile(blob);
      uploadedFiles.push(file);

      if (b.field === "kk") linkKk = file.getUrl();
      if (b.field === "akta") linkAkta = file.getUrl();
    });

    const waktuDaftar = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
    const newRow = [
      nomorPendaftaran, waktuDaftar, data.namaMurid.trim(), "'" + data.nik.trim(),
      data.tempatLahir.trim(), data.tanggalLahir.trim(), data.jenisKelamin.trim(),
      data.namaOrtu.trim(), "'" + data.nikOrtu.trim(), "'" + data.hp.trim(),
      (data.email || "").trim(), data.alamat.trim(), (data.asalTk || "").trim(),
      linkKk, linkAkta, "baru", ""
    ];

    sheet.appendRow(newRow);

    return {
      nomorPendaftaran: nomorPendaftaran,
      tanggal: waktuDaftar
    };
  } catch (err) {
    uploadedFiles.forEach(f => { try { f.setTrashed(true); } catch (e) {} });
    throw err;
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// INISIALISASI DATABASE & AKUN PERTAMA
// ==========================================

function setupAwal() {
  Logger.log("=== Memulai Setup Database & Akun Admin SD Negeri Sumberejo ===");
  const ss = getSpreadsheet();
  const spmbFolder = getSpmbFolder();
  const kontenFolder = getPublicContentFolder();

  // 1. Struktur Lembar Kerja
  const struktur = {
    "Pengaturan": ["kunci", "nilai"],
    "PenggunaAdmin": ["id", "namaPengguna", "namaTampil", "peran", "hash", "aktif", "wajibGantiSandi", "dibuat"],
    "Media": ["id", "fileId", "url", "alt", "namaAsli", "diunggah", "oleh"],
    "Log": ["waktu", "pengguna", "aksi", "modul", "ringkasan"],
    "Pengumuman": ["id", "judul", "tanggal", "kategori", "isi", "fotoUrl", "tampil"],
    "Guru": ["id", "nama", "jabatan", "fotoUrl", "urutan", "tampil"],
    "Ekstrakurikuler": ["id", "nama", "deskripsi", "pembina", "jadwal", "fotoUrl", "tampil"],
    "Fasilitas": ["id", "nama", "deskripsi", "fotoUrl", "urutan", "tampil"],
    "Galeri": ["id", "judul", "tanggal", "tipe", "url", "tampil"],
    "Pendaftar": [
      "nomorPendaftaran", "waktuDaftar", "namaMurid", "nik", "tempatLahir",
      "tanggalLahir", "jenisKelamin", "namaOrtu", "nikOrtu", "hp", "email",
      "alamat", "asalTk", "linkKk", "linkAkta", "status", "catatanAdmin"
    ]
  };

  Object.keys(struktur).forEach(sheetName => {
    let s = ss.getSheetByName(sheetName);
    if (!s) {
      s = ss.insertSheet(sheetName);
      Logger.log("✓ Membuat sheet: " + sheetName);
    }
    const headers = struktur[sheetName];
    if (s.getLastRow() === 0) {
      s.appendRow(headers);
      s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
    }
  });

  // 2. Akun Superadmin Awal
  const uSheet = ss.getSheetByName("PenggunaAdmin");
  if (uSheet.getLastRow() <= 1) {
    // Akun default: kepsek / admin12345
    const defaultHash = hashPassword("admin12345");
    uSheet.appendRow([
      "USR-001", "kepsek", "Kepala Sekolah", "superadmin", defaultHash, true, false,
      Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd")
    ]);
    // Akun editor: guru / guru12345
    const editorHash = hashPassword("guru12345");
    uSheet.appendRow([
      "USR-002", "editor", "Ibu Endang (Humas)", "editor", editorHash, true, false,
      Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd")
    ]);
    Logger.log("✓ Akun admin awal berhasil dibuat:");
    Logger.log("   - Superadmin: username 'kepsek' | password 'admin12345'");
    Logger.log("   - Editor:     username 'editor' | password 'guru12345'");
  }

  // 3. Pengaturan Awal
  const pSheet = ss.getSheetByName("Pengaturan");
  if (pSheet.getLastRow() <= 1) {
    const defaults = [
      ["namaSekolah", "SD Negeri Sumberejo 03"],
      ["alamat", "Jl Lapangan No 88 Krajan Kidul Sumberejo Kecamatan Ambulu Jember Jawatimur"],
      ["telepon", "(0338) 123456"],
      ["email", "sdn.sumberejo04@gmail.com"],
      ["whatsapp", "6281234567890"],
      ["jamLayanan", "Senin - Jumat, 07:00 - 13:00 WIB"],
      ["mapEmbedUrl", "https://maps.google.com/maps?q=SDN+Sumberejo&t=&z=15&ie=UTF8&iwloc=&output=embed"],
      ["spmbStatus", "buka"],
      ["spmbMulai", "2027-01-10"],
      ["spmbSelesai", "2027-01-31"],
      ["spmbJadwalBerikutnya", "Gelombang Berikutnya dibuka Mei 2027"],
      ["biayaPendaftaran", "Gratis (Bebas Biaya)"],
      ["akreditasi", "A"],
      ["jumlahSiswa", "185"],
      ["jumlahGuru", "14"],
      ["sambutanKepsek", "Selamat datang di website resmi SD Negeri Sumberejo. Kami mendidik dengan hati untuk membentuk karakter luhur dan generasi berprestasi."],
      ["batasHarianDaftar", "100"]
    ];
    defaults.forEach(r => pSheet.appendRow(r));
  }

  Logger.log("🎉 Setup Database, Akun Admin, dan Folder Media 100% Selesai!");
}

// ==========================================
// RESPONSE HELPER
// ==========================================

function ok(data, message = "Berhasil") {
  return createJsonResponse({
    ok: true,
    data: data,
    message: message,
    time: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd'T'HH:mm:ssXXX")
  });
}

function fail(code, message) {
  return createJsonResponse({
    ok: false,
    data: null,
    message: message,
    code: code
  });
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

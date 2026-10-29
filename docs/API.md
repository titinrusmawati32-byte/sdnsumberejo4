# Spesifikasi API dan Desain Data

**Proyek:** Landing Page SD Negeri Sumberejo 04  
**Versi:** 1.0 (final)  
**Terkait:** `PRD.md`, `README.md`

---

## 1. Gambaran Umum

Frontend berupa situs statis di GitHub Pages. Backend berupa Google Apps Script (GAS) yang di-deploy sebagai Web App dengan akses "Anyone". Data disimpan di Google Sheets, berkas di Google Drive.

```
Browser ──GET/POST──▶ GAS Web App (doGet / doPost)
                          │
                          ├──▶ Google Sheets (data)
                          ├──▶ Google Drive (berkas)
                          └──▶ MailApp (notifikasi)
```

## 2. Konvensi Umum

### 2.1 URL dan metode
- Base URL: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
- Semua aksi dipilih lewat parameter `action`.
- Pembacaan memakai `GET` dengan query string. Penulisan memakai `POST`.

### 2.2 Format respons
```json
{
  "ok": true,
  "data": { },
  "message": "Berhasil",
  "time": "2026-10-29T08:00:00+07:00"
}
```

Jika gagal:
```json
{
  "ok": false,
  "data": null,
  "message": "NIK harus 16 digit.",
  "code": "VALIDATION_ERROR"
}
```

### 2.3 Kode error
| Kode | Arti |
|---|---|
| `BAD_REQUEST` | Parameter tidak dikenal atau tidak lengkap |
| `VALIDATION_ERROR` | Isi data tidak valid |
| `OUT_OF_PERIOD` | Pendaftaran di luar periode |
| `RATE_LIMITED` | Terlalu banyak permintaan dalam waktu singkat |
| `UNAUTHORIZED` | Token admin tidak valid |
| `NOT_FOUND` | Data tidak ditemukan |
| `INTERNAL_ERROR` | Kesalahan tak terduga di server |

### 2.4 CORS dan tipe konten
- Permintaan `POST` dikirim dengan `Content-Type: text/plain;charset=utf-8` dan body berupa string JSON untuk menghindari preflight CORS.
- Di sisi GAS, body dibaca dari `e.postData.contents` lalu di-parse dengan `JSON.parse`.

## 3. Endpoint

### 3.1 Endpoint publik (GET)
- `getSiteConfig`: Pengaturan situs dan status SPMB
- `getPengumuman`: Parameter `limit` (opsional, default 10)
- `getGuru`: Daftar guru yang tampil
- `getEkskul`: Daftar ekstrakurikuler yang tampil
- `getFasilitas`: Daftar fasilitas yang tampil
- `getGaleri`: Galeri yang tampil (fase 2)
- `cekStatus`: Parameter `nomor` (wajib)

### 3.2 Endpoint tulis (POST)
- `submitPendaftaran`: Menyimpan pendaftaran dan berkas (base64)
- `admin_refreshCache`: Token admin
- `admin_setPeriode`: Token admin

## 4. Desain Sheets
Spreadsheet bernama `SDN Sumberejo 04 - Database`.
Sheet: `Pengaturan`, `Pengumuman`, `Guru`, `Ekstrakurikuler`, `Fasilitas`, `Galeri`, `Pendaftar`.

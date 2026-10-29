# SD Negeri Sumberejo 04: Landing Page

Situs resmi SD Negeri Sumberejo 04. Frontend berjalan di GitHub Pages. Data dan pendaftaran SPMB dikelola lewat Google Sheets dan Google Apps Script.

Dokumen terkait:

- `PRD.md`: kebutuhan produk, ruang lingkup, dan kriteria penerimaan
- `API.md`: spesifikasi endpoint, struktur Sheets, validasi, dan keamanan

---

## 1. Struktur Repositori

```
sdn-sumberejo-04/
├── index.html          Beranda
├── profil.html
├── guru.html
├── program.html
├── fasilitas.html
├── spmb.html
├── daftar.html         Formulir pendaftaran
├── kontak.html
├── assets/
│   ├── css/style.css
│   ├── js/config.js    URL API (bukan rahasia)
│   ├── js/api.js       Pemanggilan GAS
│   ├── js/main.js      Logika tiap halaman
│   └── img/            Logo dan foto yang sudah dikompres
├── apps-script/
│   ├── Code.gs         Kode backend GAS
│   └── appsscript.json Manifest GAS
├── docs/
│   ├── PRD.md
│   ├── API.md
│   └── README.md
└── README.md
```

Folder `apps-script/` berisi kode GAS yang disalin ke editor Apps Script. Repositori menyimpan salinan ini sebagai riwayat versi. Kode di editor GAS dan di repositori harus selalu sama.

## 2. Hal yang Tidak Boleh Masuk Repositori

- Token admin, Script Properties, atau kredensial apa pun
- ID folder Drive pribadi atau ID spreadsheet (sebaiknya disimpan di Script Properties)
- Data pendaftar, NIK, dokumen, atau berkas pribadi
- Berkas `.env` atau file konfigurasi berisi rahasia

Tambahkan berkas berikut ke `.gitignore`:

```
.clasp.json
.env
*.local
```

## 3. Menyiapkan Google Sheets

1. Masuk dengan akun Google sekolah.
2. Buat spreadsheet baru dengan nama `SDN Sumberejo 04 - Database`.
3. Buat sheet sesuai Bagian 4 di `API.md`: `Pendaftar`, `Pengaturan`, `Pengumuman`, `Guru`, `Ekstrakurikuler`, `Fasilitas`. Galeri ditambahkan saat fase 2.
4. Isi baris pertama setiap sheet dengan nama kolom persis seperti di `API.md`.
5. Isi sheet `Pengaturan` dengan data sekolah. Kolom `kunci` dan `nilai` wajib diisi untuk semua kunci yang tercantum.
6. Aktifkan riwayat versi: File > Version history.
7. Simpan ID spreadsheet dari URL (bagian di antara `/d/` dan `/edit`). ID ini akan dimasukkan ke Script Properties.

## 4. Menyiapkan Google Drive

1. Buat folder `SPMB` (berkas pendaftar, tidak dibagikan publik).
2. Buat folder `Konten Publik` (foto guru, fasilitas, galeri). Folder ini boleh dibagikan sebagai "Anyone with the link: Viewer" bila foto perlu tampil di situs.
3. Simpan ID kedua folder untuk Script Properties.

## 5. Menyiapkan Google Apps Script

1. Buka script.google.com dengan akun sekolah. Buat proyek baru: `SDN Sumberejo 04 API`.
2. Salin isi `apps-script/Code.gs` ke editor.
3. Isi Script Properties (Project Settings > Script Properties):

| Kunci | Isi |
|---|---|
| `SHEET_ID` | ID spreadsheet dari langkah 3.7 |
| `FOLDER_SPMB_ID` | ID folder SPMB |
| `FOLDER_KONTEN_ID` | ID folder Konten Publik |
| `ADMIN_TOKEN` | Token acak panjang (minimal 32 karakter), dibuat dengan generator kata sandi |

4. Jalankan fungsi `setupAwal` sekali dari editor untuk memberi izin akses (Review permissions). Fungsi ini hanya memeriksa keberadaan Sheets dan folder, tidak mengubah data.
5. Deploy: Deploy > New deployment > Type: Web app.
   - Execute as: Me
   - Who has access: Anyone
6. Salin URL Web App. URL ini dimasukkan ke `assets/js/config.js`.

## 6. Menghubungkan Frontend

Isi `assets/js/config.js`:

```javascript
window.APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
};
```

Berkas ini boleh masuk repositori karena URL Web App bukan rahasia. Token admin tidak pernah ditaruh di sini.

## 7. Menjalankan Secara Lokal

Cukup buka `index.html` di browser, atau jalankan server statis sederhana:

```
npx serve .
```

Pastikan `API_URL` sudah diisi. Jika memakai URL deployment baru, uji semua endpoint publik lewat browser:

```
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=getSiteConfig
```

Respons harus berupa JSON dengan `"ok": true`.

## 8. Publikasi ke GitHub Pages

1. Buat repositori publik `sdn-sumberejo-04` (atau nama lain). Untuk akun gratis, GitHub Pages hanya tersedia pada repositori publik.
2. Unggah seluruh berkas, kecuali yang tercantum di Bagian 2.
3. Settings > Pages > Source: Deploy from a branch > Branch: `main` / root.
4. Situs tersedia di `https://USERNAME.github.io/sdn-sumberejo-04/`.
5. Jika memakai domain khusus, tambahkan berkas `CNAME` dan atur DNS sesuai petunjuk GitHub.

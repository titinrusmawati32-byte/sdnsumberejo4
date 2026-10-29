# PRD: Landing Page SD Negeri Sumberejo 04

**Versi:** 1.0 (final)  
**Status:** Siap dikembangkan  
**Bahasa:** Indonesia  
**Terkait:** `API.md` (spesifikasi API dan data), `README.md` (panduan deploy dan pengelolaan)

---

## 1. Ringkasan

Landing page resmi SD Negeri Sumberejo 04 sebagai wajah digital sekolah. Halaman ini membantu calon orang tua murid memahami sekolah, mengetahui alur SPMB, dan mendaftar secara online. Siswa, alumni, dan masyarakat umum juga dapat memperoleh informasi profil sekolah, kegiatan, dan pengumuman.

Arsitektur memakai GitHub Pages untuk frontend dan Google Apps Script (GAS) dengan Google Sheets sebagai backend dan basis data. Biaya operasional ditargetkan mendekati nol.

## 2. Latar Belakang dan Masalah

Informasi sekolah dan jadwal pendaftaran tersebar di papan pengumuman, grup WhatsApp, dan dari mulut ke mulut. Calon orang tua kesulitan memperoleh informasi yang lengkap dan terbaru, sementara pihak sekolah terus menerima pertanyaan yang sama berulang kali.

## 3. Tujuan dan Metrik Keberhasilan

| Tujuan | Metrik | Target |
|---|---|---|
| Memudahkan pendaftaran murid baru | Jumlah pendaftaran online per periode SPMB | Seluruh pendaftaran tercatat di Sheets tanpa kehilangan data |
| Informasi mudah ditemukan | Waktu menemukan info biaya dan persyaratan (uji coba dengan 5 orang tua) | Di bawah 30 detik |
| Mengurangi pertanyaan berulang | Jumlah pertanyaan WhatsApp per minggu saat SPMB | Turun dibanding periode SPMB sebelumnya |
| Membangun citra sekolah | Kunjungan unik dan durasi kunjungan | Dipantau melalui Google Analytics atau statistik GitHub Pages |

## 4. Pengguna dan Kebutuhan

| Pengguna | Kebutuhan utama |
|---|---|
| Orang tua calon murid (utama) | Syarat, jadwal, biaya, dan cara daftar yang jelas. Umumnya memakai ponsel. |
| Orang tua murid aktif | Pengumuman terbaru, kontak sekolah, kalender akademik |
| Alumni dan masyarakat umum | Profil sekolah, prestasi, berita |
| Siswa | Kegiatan, ekstrakurikuler, galeri |
| Admin sekolah (non-teknis) | Mengedit konten lewat Google Sheets tanpa menyentuh kode |
| Pengembang | Memelihara kode frontend dan GAS |

## 5. Keputusan dan Asumsi

| No | Keputusan | Alasan |
|---|---|---|
| K1 | Akun Google khusus sekolah (bukan akun pribadi) untuk Sheets, Drive, dan GAS | Mengurangi risiko akun pindah tangan atau terkunci |
| K2 | Domain awal memakai `username.github.io`. Domain khusus (misalnya `.sch.id`) bisa ditambahkan kemudian | Tanpa biaya tambahan |
| K3 | Pendaftaran disimpan di Sheets. Ekspor ke sistem SPMB dinas dilakukan manual sesuai format yang diminta dinas | Integrasi langsung di luar lingkup |
| K4 | Estimasi pendaftar di bawah 300 orang per periode. Kuota GAS dianggap cukup dengan caching | Perlu diverifikasi |
| K5 | Admin menerima notifikasi email setiap ada pendaftar baru | Dikirim lewat MailApp |
| K6 | Visual formal dan bersih, memakai warna dari logo sekolah | Konsistensi identitas |
| K7 | Pengembangan bertahap: MVP lebih dulu, fase 2 menyusul | Mengurangi risiko dan beban awal |

## 6. Ruang Lingkup

### 6.1 MVP (wajib)

| ID | Fitur | Deskripsi singkat |
|---|---|---|
| F01 | Beranda | Sambutan kepala sekolah, sorotan (jumlah siswa, jumlah guru, keunggulan), tombol "Daftar Sekarang", pengumuman terbaru |
| F02 | Profil sekolah | Sejarah, visi dan misi, akreditasi, struktur organisasi |
| F03 | Informasi SPMB | Jadwal, syarat, alur, biaya (jika ada). Dibaca dari Sheets |
| F04 | Formulir pendaftaran online | Validasi data, upload berkas, submit ke GAS |
| F05 | Program dan ekstrakurikuler | Daftar kegiatan dengan deskripsi dan pembina |
| F06 | Fasilitas | Daftar dan foto fasilitas |
| F07 | Data guru dan tenaga kependidikan | Nama, jabatan, foto (dengan persetujuan) |
| F08 | Kontak dan lokasi | Alamat, telepon, email, jam layanan, peta embed Google Maps |
| F09 | Tombol WhatsApp | Tombol mengambang untuk menghubungi admin |
| F10 | Halaman status konfigurasi | Menampilkan apakah pendaftaran sedang dibuka atau ditutup |

### 6.2 Fase 2

- Galeri foto dan video (berkas di Drive, daftar di Sheets)
- Berita dan pengumuman dengan arsip
- Kalender akademik
- Testimoni orang tua dan alumni
- Halaman prestasi siswa
- Cek status pendaftaran berdasarkan nomor pendaftaran

### 6.3 Di luar lingkup

- Sistem akademik (nilai, absensi, rapor)
- Pembayaran online
- Login orang tua atau siswa
- Integrasi langsung dengan sistem SPMB dinas

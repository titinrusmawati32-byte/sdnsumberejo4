import test from "node:test";
import assert from "node:assert/strict";
import { createCmsStore } from "./cmsStore.js";

test("public endpoints return seeded school configuration and collections", () => {
  const store = createCmsStore();
  const config = store.handleGet("getSiteConfig");
  assert.equal(config.namaSekolah, "SDN SUMBEREJO 04 AMBULU");
  assert.equal(config.spmbStatus, "buka");

  const guru = store.handleGet("getGuru");
  assert.equal(guru.length >= 8, true);
  assert.equal(guru[0].jabatan, "Kepala Sekolah");

  const pengumuman = store.handleGet("getPengumuman", { limit: 3 });
  assert.equal(pengumuman.length, 3);

  store.applyRemoteBundle({
    config: { namaSekolah: "SDN SUMBEREJO 04 AMBULU", jumlahSiswa: 286 },
    pengumuman: [
      { id: "PENG-LIVE-1", judul: 12345, isi: 54321, tanggal: "2026-04-20", kategori: "Informasi Sekolah", tampil: true }
    ]
  });
  const livePengumuman = store.handleGet("getPengumuman", { limit: 5 });
  assert.equal(typeof livePengumuman[0].isi, "string");
  assert.equal(livePengumuman[0].isi, "54321");
});

test("SPMB registration validates NIK and generates sequential registration number", () => {
  const store = createCmsStore();

  assert.throws(
    () =>
      store.handlePost({
        action: "submitPendaftaran",
        data: { namaMurid: "Budi", nik: "12345" }
      }),
    /16 digit NIK/
  );

  const res = store.handlePost({
    action: "submitPendaftaran",
    data: {
      namaMurid: "Budi Santoso",
      nik: "3509120101200009",
      tempatLahir: "Jember",
      tanggalLahir: "2020-01-01",
      jenisKelamin: "Laki-laki",
      namaOrtu: "Agus Santoso",
      nikOrtu: "3509120101850009",
      hp: "081234567899",
      alamat: "Krajan Kidul, Sumberejo"
    }
  });

  assert.match(res.nomorPendaftaran, /^SPMB-\d{4}-0003$/);

  const statusCheck = store.handleGet("cekStatus", { nomor: res.nomorPendaftaran });
  assert.equal(statusCheck.ditemukan, true);
  assert.equal(statusCheck.namaMurid, "Budi Santoso");
});

test("Admin authentication and CRUD operations enforce role permissions", () => {
  const store = createCmsStore();

  const login = store.handlePost({
    action: "admin_login",
    namaPengguna: "kepsek",
    kataSandi: "admin12345"
  });
  assert.ok(login.token);
  assert.equal(login.pengguna.peran, "superadmin");

  const bundle = store.handlePost({
    action: "admin_getBundle",
    token: login.token
  });
  assert.equal(bundle.pendaftar.length, 2);
  assert.equal(bundle.pengumumanCount, 3);

  const saved = store.handlePost({
    action: "admin_saveRow",
    token: login.token,
    sheetName: "Pengumuman",
    data: {
      judul: "Libur Awal Ramadhan",
      tanggal: "2026-11-01",
      kategori: "Informasi Sekolah",
      isi: "Kegiatan belajar mengajar diliburkan pada awal Ramadhan.",
      tampil: true
    }
  });
  assert.equal(saved.success, true);
  assert.equal(store.handleGet("getPengumuman", { limit: 10 }).length, 4);

  const savedUser = store.handlePost({
    action: "admin_saveUser",
    token: login.token,
    data: {
      namaPengguna: "guru_ipa",
      namaTampil: "Ibu Rina, S.Pd.",
      peran: "editor",
      kataSandi: "rina12345",
      aktif: true
    }
  });
  assert.equal(savedUser.success, true);
  const allUsers = store.handlePost({ action: "admin_listUsers", token: login.token });
  assert.equal(allUsers.length, 4);

  // Verify binary media upload returns short /api/media/ URL instead of huge data: string
  const fakeJpgBase64 = Buffer.from("fake-jpeg-binary-content").toString("base64");
  const uploaded = store.handlePost({
    action: "admin_uploadMedia",
    token: login.token,
    berkas: {
      nama: "foto-besar.jpg",
      mime: "image/jpeg",
      base64: fakeJpgBase64
    },
    alt: "Foto Kegiatan Besar"
  });
  assert.match(uploaded.url, /^\/api\/media\/MED-/);
  const storedMedia = store.getMediaFile(uploaded.id);
  assert.ok(storedMedia);
  assert.equal(storedMedia.buffer.toString("utf-8"), "fake-jpeg-binary-content");
});

test("Firebase Authentication registers bootstrapped admin and grants valid session", () => {
  const store = createCmsStore();

  const fbLogin = store.handlePost({
    action: "admin_firebase_login",
    email: "bahanajarp@gmail.com",
    uid: "test-firebase-uid-12345",
    displayName: "Admin Utama"
  });

  assert.ok(fbLogin.token);
  assert.equal(fbLogin.pengguna.peran, "superadmin");
  assert.equal(fbLogin.pengguna.email, "bahanajarp@gmail.com");

  const me = store.handlePost({
    action: "admin_me",
    token: fbLogin.token
  });
  assert.equal(me.pengguna.email, "bahanajarp@gmail.com");

  // Unauthorized email rejected
  assert.throws(() => {
    store.handlePost({
      action: "admin_firebase_login",
      email: "intruder@gmail.com",
      uid: "intruder-uid"
    });
  }, /belum terdaftar di daftar pengguna admin/);
});

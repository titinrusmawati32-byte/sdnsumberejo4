/**
 * INTEGRASI FIREBASE AUTHENTICATION & FIRESTORE — ADMIN CMS
 * SD NEGERI SUMBEREJO 04 AMBULU
 * Project: flowing-landing-p1ttq
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write"
};

function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let app = null;
let auth = null;
let db = null;
let isInitialized = false;
let configData = null;

async function initFirebase() {
  if (isInitialized) return { app, auth, db, config: configData };

  try {
    let cfg = null;
    try {
      const res = await fetch("/api/firebase-config");
      if (res.ok) {
        cfg = await res.json();
      }
    } catch {}

    if (!cfg) {
      cfg = {
        projectId: "flowing-landing-p1ttq",
        appId: "1:658106437485:web:25c4a3ddaf8839d208d464",
        apiKey: "AIzaSyD1OC3GXFjNViCP5oRD8Iur7l53A10GbRA",
        authDomain: "flowing-landing-p1ttq.firebaseapp.com",
        firestoreDatabaseId: "ai-studio-senapati-576aa692-d29b-404c-a567-79c97545d9e4",
        storageBucket: "flowing-landing-p1ttq.firebasestorage.app",
        messagingSenderId: "658106437485"
      };
    }

    configData = cfg;
    app = initializeApp(cfg);
    auth = getAuth(app);
    db = getFirestore(app, cfg.firestoreDatabaseId);

    // Test connection on boot per Firebase guidelines
    testConnection();

    isInitialized = true;
    console.log("Firebase Authentication & Firestore berhasil diinisialisasi (" + cfg.projectId + ")");
    return { app, auth, db, config: configData };
  } catch (err) {
    console.error("Gagal menginisialisasi Firebase:", err);
    return null;
  }
}

async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

/**
 * Login ke CMS menggunakan Akun Google (Firebase Auth Popup)
 */
async function loginWithGoogle() {
  const fb = await initFirebase();
  if (!fb || !fb.auth) {
    throw new Error("Layanan Firebase belum siap. Periksa koneksi internet Anda.");
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(fb.auth, provider);
  const user = result.user;

  if (!user || !user.email) {
    throw new Error("Gagal mengambil informasi profil dari akun Google.");
  }

  const idToken = await user.getIdToken();

  // Daftarkan/verifikasi ke backend CMS untuk mendapatkan token sesi terenkripsi
  const res = await fetch("/api/gas", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      action: "admin_firebase_login",
      email: user.email,
      uid: user.uid,
      displayName: user.displayName || user.email.split("@")[0],
      idToken
    })
  });

  const json = await res.json();
  if (!json.ok) {
    await signOut(fb.auth);
    throw new Error(json.message || "Akun Google ini tidak memiliki hak akses admin.");
  }

  // Simpan record profil ke Firestore jika user belum ada
  try {
    const adminRef = doc(fb.db, "admins", user.uid);
    await setDoc(
      adminRef,
      {
        email: user.email,
        username: user.email.split("@")[0],
        displayName: user.displayName || "Admin",
        role: "superadmin",
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    // Non-blocking firestore sync
  }

  return json.data;
}

/**
 * Daftarkan Username Rahasia / Akun Admin Baru ke Firebase & Firestore
 */
async function registerAdminInFirebase({ email, username, displayName, role }) {
  const fb = await initFirebase();
  if (!fb || !fb.db) {
    throw new Error("Layanan Firebase belum siap.");
  }

  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanName = String(displayName || username).trim();
  const cleanRole = role || "editor";

  if (!cleanEmail || !cleanUsername) {
    throw new Error("Email dan username rahasia wajib diisi.");
  }

  const docId = cleanUsername.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `admins/${docId}`;

  try {
    const ref = doc(fb.db, "admins", docId);
    await setDoc(ref, {
      email: cleanEmail,
      username: cleanUsername,
      displayName: cleanName,
      role: cleanRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }

  return { ok: true, email: cleanEmail, username: cleanUsername, role: cleanRole };
}

// Inisialisasi otomatis
initFirebase();

window.FirebaseAdminAuth = {
  initFirebase,
  loginWithGoogle,
  registerAdminInFirebase,
  testConnection,
  getProjectId: () => (configData ? configData.projectId : "flowing-landing-p1ttq"),
  getDatabaseId: () => (configData ? configData.firestoreDatabaseId : "")
};

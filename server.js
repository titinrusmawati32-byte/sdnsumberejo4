import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCmsStore } from "./lib/cmsStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const store = createCmsStore();

const DEFAULT_GAS_URL =
  process.env.GAS_API_URL ||
  "https://script.google.com/macros/s/AKfycbycxG7Ctmdj_6x8CQJRlXBqr302UEgZ8JQ5f4qI52AlJBWI9W2YtYocEK7Z2_ZyIhhj3w/exec";

let activeGasUrl = DEFAULT_GAS_URL;
let cachedGasToken = null;
let lastGasSyncTime = null;
let isSyncingGas = false;

// Connected Server-Sent Events (SSE) clients for 0ms real-time broadcast
const sseClients = new Set();

// Cache for Google Drive images & in-flight GAS media uploads
const driveImageCache = new Map();
const pendingMediaUploads = new Map();
const loginRateLimitMap = new Map();

function broadcastEvent(eventName, payload) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * Pulls latest public bundle from Google Apps Script in the background
 * and hydrates the local memory store without blocking requests.
 */
async function syncFromGoogleAppsScript() {
  if (!activeGasUrl || isSyncingGas) return false;
  isSyncingGas = true;
  try {
    const res = await fetch(`${activeGasUrl}?action=getSiteBundle&_t=${Date.now()}`, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json && json.ok && json.data) {
      store.applyRemoteBundle(json.data);
      lastGasSyncTime = new Date().toISOString();
      broadcastEvent("cms_update", {
        source: "gas_pull",
        time: lastGasSyncTime,
        bundle: store.handleGet("getSiteBundle")
      });
      return true;
    }
  } catch (err) {
    // Keep serving fast cached store if GAS is temporarily unreachable
  } finally {
    isSyncingGas = false;
  }
  return false;
}

/**
 * Ensures we have a valid Google Apps Script admin session token
 * and forwards admin write operations to Google Sheets in the background.
 */
async function ensureGasAdminToken(username = "kepsek", password = "admin12345") {
  if (cachedGasToken) return cachedGasToken;
  try {
    const res = await fetch(activeGasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "admin_login",
        namaPengguna: username,
        kataSandi: password
      })
    });
    const json = await res.json();
    if (json && json.ok && json.data && json.data.token) {
      cachedGasToken = json.data.token;
      return cachedGasToken;
    }
  } catch {}
  return null;
}

async function syncAdminCollectionsFromGas(sessionUser) {
  if (!activeGasUrl) return;
  try {
    const token = await ensureGasAdminToken(
      sessionUser?.namaPengguna || "kepsek",
      sessionUser?.kataSandi || "admin12345"
    );
    if (!token) return;

    const bundleRes = await fetch(activeGasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "admin_getBundle", token })
    });
    const bundleJson = await bundleRes.json();
    if (bundleJson && bundleJson.ok && bundleJson.data) {
      store.applyRemoteBundle(bundleJson.data);
    }

    const sheets = ["Pengumuman", "Guru", "Ekstrakurikuler", "Fasilitas", "Galeri"];
    await Promise.all(
      sheets.map(async (sheetName) => {
        try {
          const r = await fetch(activeGasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "admin_getCollection", sheetName, token })
          });
          const j = await r.json();
          if (j && j.ok && Array.isArray(j.data) && j.data.length > 0) {
            store.applyRemoteCollection(sheetName, j.data);
          }
        } catch {}
      })
    );

    lastGasSyncTime = new Date().toISOString();
    broadcastEvent("cms_update", {
      source: "gas_admin_sync",
      time: lastGasSyncTime,
      bundle: store.handleGet("getSiteBundle")
    });
  } catch {}
}

/**
 * Forwards write actions asynchronously to Google Apps Script
 * so the user gets <10ms response time while Google Sheets stays 100% synced.
 */
async function forwardWriteToGas(body, sessionUser, localResult) {
  if (!activeGasUrl) return;
  const writeActions = new Set([
    "submitPendaftaran",
    "admin_saveKonten",
    "admin_saveRow",
    "admin_deleteRow",
    "admin_toggleRow",
    "admin_updatePendaftar",
    "admin_uploadMedia",
    "admin_uploadVideo"
  ]);
  if (!writeActions.has(body.action)) return;

  broadcastEvent("gas_syncing", { action: body.action, time: new Date().toISOString() });

  const executeGasPost = async () => {
    let payload = { ...body };
    if (body.action !== "submitPendaftaran") {
      const token = await ensureGasAdminToken(
        sessionUser?.namaPengguna || "kepsek",
        sessionUser?.kataSandi || "admin12345"
      );
      if (!token) return null;
      payload.token = token;

      if (body.action === "admin_saveRow" && payload.data) {
        const rowData = { ...payload.data };
        if (localResult?.id) {
          rowData.id = localResult.id;
        }
        // Resolve any local /api/media/MED-... URLs to their Google Drive URL before saving to Google Sheets
        const photoFields = ["fotoUrl", "bannerUrl", "foto", "gambar", "thumbnail", "url"];
        for (const field of photoFields) {
          const val = rowData[field] ? String(rowData[field]).trim() : "";
          if (val.startsWith("/api/media/")) {
            let remoteUrl = null;
            if (pendingMediaUploads.has(val)) {
              try {
                remoteUrl = await pendingMediaUploads.get(val);
              } catch {}
            }
            if (!remoteUrl) {
              const mf = store.getMediaFile(val.replace("/api/media/", ""));
              if (mf && mf.remoteUrl) remoteUrl = mf.remoteUrl;
            }
            if (remoteUrl) {
              rowData[field] = remoteUrl;
            }
          }
        }
        payload.data = rowData;
      }
    }

    let res = await fetch(activeGasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    let json = await res.json();

    // If GAS token expired, re-authenticate once and retry
    if (json && !json.ok && json.code === "UNAUTHORIZED" && body.action !== "submitPendaftaran") {
      cachedGasToken = null;
      const freshToken = await ensureGasAdminToken(
        sessionUser?.namaPengguna || "kepsek",
        sessionUser?.kataSandi || "admin12345"
      );
      if (freshToken) {
        payload.token = freshToken;
        res = await fetch(activeGasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        json = await res.json();
      }
    }

    if (body.action === "admin_uploadMedia" && localResult?.url && json?.ok && json?.data?.url) {
      store.updateMediaRemoteUrl(localResult.url, json.data.url);
    }

    lastGasSyncTime = new Date().toISOString();
    broadcastEvent("gas_synced", {
      ok: Boolean(json && json.ok),
      action: body.action,
      time: lastGasSyncTime,
      data: json?.data || null
    });

    return json?.data?.url || null;
  };

  try {
    if (body.action === "admin_uploadMedia" && localResult?.url) {
      const uploadPromise = executeGasPost().finally(() => {
        setTimeout(() => pendingMediaUploads.delete(localResult.url), 60000);
      });
      pendingMediaUploads.set(localResult.url, uploadPromise);
      await uploadPromise;
    } else {
      await executeGasPost();
    }
  } catch (err) {
    broadcastEvent("gas_synced", {
      ok: false,
      action: body.action,
      error: err.message
    });
  }
}

// Initial hydration from Google Apps Script on server boot
syncFromGoogleAppsScript();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

function readRequestBody(req, maxBytes = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Ukuran permintaan melebihi batas 50 MB."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept"
      });
      res.end();
      return;
    }

    // Server-Sent Events (SSE) stream for real-time instant updates across tabs
    if (pathname === "/api/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });
      res.write(
        `event: connected\ndata: ${JSON.stringify({
          gasUrl: activeGasUrl,
          lastSync: lastGasSyncTime
        })}\n\n`
      );
      sseClients.add(res);
      req.on("close", () => {
        sseClients.delete(res);
      });
      return;
    }

    // Server healthcheck endpoint
    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        status: "healthy",
        uptime: process.uptime(),
        time: new Date().toISOString()
      });
      return;
    }

    // Force immediate pull from Google Apps Script
    if (pathname === "/api/gas-sync" && req.method === "POST") {
      const ok = await syncFromGoogleAppsScript();
      sendJson(res, 200, {
        ok: true,
        syncedWithGas: ok,
        lastSync: lastGasSyncTime,
        data: store.handleGet("getSiteBundle")
      });
      return;
    }

    // Serve uploaded binary media files directly (<1ms, no Base64 overhead)
    if (pathname.startsWith("/api/media/") && req.method === "GET") {
      const mediaId = pathname.slice("/api/media/".length);
      const mediaFile = store.getMediaFile(mediaId);
      if (mediaFile && mediaFile.buffer) {
        res.writeHead(200, {
          "Content-Type": mediaFile.mime || "image/jpeg",
          "Content-Length": mediaFile.buffer.length,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*"
        });
        res.end(mediaFile.buffer);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Media Not Found");
      return;
    }

    // Proxy & cache Google Drive images to bypass iframe CORP / third-party cookie blocks
    if (pathname === "/api/drive-image" && req.method === "GET") {
      const driveId = parsedUrl.searchParams.get("id");
      if (!driveId || !/^[a-zA-Z0-9_-]+$/.test(driveId)) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Invalid Drive ID");
        return;
      }

      if (driveImageCache.has(driveId)) {
        const cached = driveImageCache.get(driveId);
        res.writeHead(200, {
          "Content-Type": cached.contentType,
          "Content-Length": cached.buffer.length,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*"
        });
        res.end(cached.buffer);
        return;
      }

      try {
        const urlsToTry = [
          `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`,
          `https://lh3.googleusercontent.com/d/${driveId}=w1200`,
          `https://drive.google.com/uc?export=view&id=${driveId}`
        ];
        for (const targetUrl of urlsToTry) {
          const r = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
            }
          });
          const ct = r.headers.get("content-type") || "";
          if (r.ok && ct.startsWith("image/")) {
            const arrBuf = await r.arrayBuffer();
            const buffer = Buffer.from(arrBuf);
            if (buffer.length > 0) {
              driveImageCache.set(driveId, { buffer, contentType: ct });
              res.writeHead(200, {
                "Content-Type": ct,
                "Content-Length": buffer.length,
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*"
              });
              res.end(buffer);
              return;
            }
          }
        }
      } catch {}

      res.writeHead(302, {
        Location: "/assets/img/pengumuman-sumpah-pemuda.svg",
        "Access-Control-Allow-Origin": "*"
      });
      res.end();
      return;
    }

    // Firebase Applet Config endpoint for Admin CMS
    if (pathname === "/api/firebase-config" && req.method === "GET") {
      try {
        const configPath = path.join(__dirname, "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, "utf-8");
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*"
          });
          res.end(raw);
          return;
        }
      } catch {}
      sendJson(res, 404, { ok: false, message: "Firebase config not found" });
      return;
    }

    // Real-time Google Apps Script compatible API endpoint
    if (pathname === "/api/gas") {
      if (req.method === "GET") {
        try {
          const query = Object.fromEntries(parsedUrl.searchParams.entries());
          const action = query.action ? String(query.action) : "";
          const data = store.handleGet(action, query);
          sendJson(res, 200, {
            ok: true,
            data,
            gasSynced: Boolean(lastGasSyncTime),
            lastSync: lastGasSyncTime,
            message: "Berhasil",
            time: new Date().toISOString()
          });
        } catch (err) {
          sendJson(res, 200, {
            ok: false,
            data: null,
            code: err.code || "BAD_REQUEST",
            message: err.message || "Terjadi kesalahan pada server."
          });
        }
        return;
      }

      if (req.method === "POST") {
        const clientIp = String(
          req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local"
        )
          .split(",")[0]
          .trim();

        let parsedBody = {};
        try {
          const rawBody = await readRequestBody(req);
          parsedBody = rawBody ? JSON.parse(rawBody) : {};

          if (parsedBody.action === "admin_login") {
            const now = Date.now();
            const attempt = loginRateLimitMap.get(clientIp) || { count: 0, lockUntil: 0 };
            if (attempt.lockUntil && now < attempt.lockUntil) {
              const waitSec = Math.ceil((attempt.lockUntil - now) / 1000);
              sendJson(res, 200, {
                ok: false,
                data: null,
                code: "TOO_MANY_ATTEMPTS",
                message: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${waitSec} detik.`
              });
              return;
            }
          }

          const sessionUser = parsedBody.token ? store.getSession(parsedBody.token) : null;
          const data = store.handlePost(parsedBody || {});

          if (parsedBody.action === "admin_login") {
            loginRateLimitMap.delete(clientIp);
          }

          // Broadcast instant update to all connected public & admin tabs
          if (
            [
              "admin_saveKonten",
              "admin_saveRow",
              "admin_deleteRow",
              "admin_toggleRow",
              "admin_updatePendaftar",
              "submitPendaftaran"
            ].includes(parsedBody.action)
          ) {
            broadcastEvent("cms_update", {
              source: parsedBody.action,
              time: new Date().toISOString(),
              bundle: store.handleGet("getSiteBundle")
            });
          }

          // Trigger background sync with live Google Apps Script
          if (parsedBody.action === "admin_login") {
            syncAdminCollectionsFromGas({
              namaPengguna: parsedBody.namaPengguna,
              kataSandi: parsedBody.kataSandi
            });
          } else {
            forwardWriteToGas(parsedBody, sessionUser, data);
          }

          sendJson(res, 200, {
            ok: true,
            data,
            message: "Berhasil",
            time: new Date().toISOString()
          });
        } catch (err) {
          if (parsedBody && parsedBody.action === "admin_login") {
            const cur = loginRateLimitMap.get(clientIp) || { count: 0, lockUntil: 0 };
            const nextCount = (cur.count || 0) + 1;
            const lockUntil = nextCount >= 5 ? Date.now() + 60 * 1000 : 0;
            loginRateLimitMap.set(clientIp, {
              count: nextCount >= 5 ? 0 : nextCount,
              lockUntil
            });
          }
          sendJson(res, 200, {
            ok: false,
            data: null,
            code: err.code || "INTERNAL_ERROR",
            message: err.message || "Terjadi kesalahan pada server."
          });
        }
        return;
      }
    }

    // Block direct public access to sensitive backend/source directories
    if (pathname.startsWith("/apps-script") || pathname.startsWith("/lib")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    // Resolve static file path safely within __dirname
    let relPath = pathname === "/" ? "/index.html" : pathname;
    if (relPath === "/admin" || relPath === "/admin/") {
      relPath = "/admin/index.html";
    }

    const safeSuffix = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = path.join(__dirname, safeSuffix);

    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Support HTTP Range requests for video streaming
    const range = req.headers.range;
    if (range && (ext === ".mp4" || ext === ".webm")) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      if (start >= stat.size || end >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    const isAdminRoute = relPath.startsWith("/admin");
    const responseHeaders = {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "X-Content-Type-Options": "nosniff"
    };
    if (isAdminRoute) {
      responseHeaders["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
      responseHeaders["Pragma"] = "no-cache";
      responseHeaders["Expires"] = "0";
      responseHeaders["X-Robots-Tag"] = "noindex, nofollow, noarchive";
      responseHeaders["Referrer-Policy"] = "no-referrer";
    }

    res.writeHead(200, responseHeaders);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`SD Negeri Sumberejo 04 server listening on http://0.0.0.0:${PORT}`);
});

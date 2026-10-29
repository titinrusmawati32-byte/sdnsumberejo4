import { createCmsStore } from "../lib/cmsStore.js";

const store = createCmsStore();

const DEFAULT_GAS_URL =
  process.env.GAS_API_URL ||
  "https://script.google.com/macros/s/AKfycbycxG7Ctmdj_6x8CQJRlXBqr302UEgZ8JQ5f4qI52AlJBWI9W2YtYocEK7Z2_ZyIhhj3w/exec";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    try {
      const query = req.query || {};
      const action = query.action ? String(query.action) : "getSiteBundle";
      const data = store.handleGet(action, query);
      res.status(200).json({
        ok: true,
        data,
        message: "Berhasil",
        time: new Date().toISOString()
      });
    } catch (err) {
      res.status(200).json({
        ok: false,
        data: null,
        code: err.code || "BAD_REQUEST",
        message: err.message || "Terjadi kesalahan pada server."
      });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
          body = {};
        }
      }
      body = body || {};

      const data = store.handlePost(body);

      // Asynchronously forward write actions to Google Apps Script
      if (DEFAULT_GAS_URL && !DEFAULT_GAS_URL.includes("SAMPLE_DEPLOYMENT_ID")) {
        try {
          fetch(DEFAULT_GAS_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(body)
          }).catch(() => {});
        } catch {}
      }

      res.status(200).json({
        ok: true,
        data,
        message: "Berhasil",
        time: new Date().toISOString()
      });
    } catch (err) {
      res.status(200).json({
        ok: false,
        data: null,
        code: err.code || "INTERNAL_ERROR",
        message: err.message || "Terjadi kesalahan pada server."
      });
    }
    return;
  }

  res.status(405).json({ ok: false, message: "Method Not Allowed" });
}

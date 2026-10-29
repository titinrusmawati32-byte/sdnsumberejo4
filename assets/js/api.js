/**
 * Klien API Frontend SD Negeri Sumberejo 04
 * Mendukung Akselerator Realtime (/api/gas + SSE + BroadcastChannel)
 * dan Fallback Langsung ke Google Apps Script Web App
 */

(function () {
  const getGasUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : "";
  };

  const getProxyUrl = () => {
    return (window.APP_CONFIG && window.APP_CONFIG.PROXY_URL) ? window.APP_CONFIG.PROXY_URL : "/api/gas";
  };

  async function fetchJsonWithFallback(primaryUrl, fallbackUrl, options) {
    try {
      const res = await fetch(primaryUrl, options);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          return await res.json();
        }
      }
    } catch (e) {}

    if (!fallbackUrl) {
      throw new Error("Endpoint API tidak tersedia.");
    }

    const fallbackRes = await fetch(fallbackUrl, options);
    if (!fallbackRes.ok) {
      throw new Error(`HTTP Error ${fallbackRes.status}: Gagal menghubungi server Google Apps Script.`);
    }
    return await fallbackRes.json();
  }

  /**
   * Panggilan HTTP GET publik secara REAL-TIME
   * @param {string} action Nama endpoint aksi
   * @param {object} params Parameter query tambahan
   * @returns {Promise<any>}
   */
  async function apiGet(action, params = {}) {
    const gasUrl = getGasUrl();
    const proxyUrl = getProxyUrl();
    const qs = new URLSearchParams({ action, ...params, _t: Date.now() }).toString();

    const primary = `${proxyUrl}?${qs}`;
    const fallback = gasUrl && !gasUrl.includes("SAMPLE_DEPLOYMENT_ID") ? `${gasUrl}?${qs}` : "";

    try {
      const json = await fetchJsonWithFallback(primary, fallback, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!json.ok) {
        throw new Error(json.message || "Permintaan API gagal diproses.");
      }
      return json.data;
    } catch (err) {
      console.error(`[API Error - ${action}]:`, err);
      throw err;
    }
  }

  /**
   * Panggilan HTTP POST (pendaftaran & formulir)
   * @param {object} payload Payload data JSON
   * @returns {Promise<any>}
   */
  async function apiPost(payload) {
    const gasUrl = getGasUrl();
    const proxyUrl = getProxyUrl();
    const fallback = gasUrl && !gasUrl.includes("SAMPLE_DEPLOYMENT_ID") ? gasUrl : "";

    try {
      const json = await fetchJsonWithFallback(proxyUrl, fallback, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!json.ok) {
        const error = new Error(json.message || "Gagal memproses permintaan.");
        error.code = json.code;
        error.data = json.data;
        throw error;
      }
      return json.data;
    } catch (err) {
      console.error("[API POST Error]:", err);
      throw err;
    }
  }

  window.SchoolAPI = {
    get: apiGet,
    post: apiPost
  };
})();

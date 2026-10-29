export default async function handler(req, res) {
  const driveId = req.query?.id;
  if (!driveId || !/^[a-zA-Z0-9_-]+$/.test(driveId)) {
    return res.status(400).send("Invalid Drive ID");
  }

  const urlsToTry = [
    `https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`,
    `https://lh3.googleusercontent.com/d/${driveId}=w1200`,
    `https://drive.google.com/uc?export=view&id=${driveId}`
  ];

  for (const targetUrl of urlsToTry) {
    try {
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
          res.setHeader("Content-Type", ct);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("Access-Control-Allow-Origin", "*");
          return res.status(200).send(buffer);
        }
      }
    } catch {}
  }

  return res.redirect(302, "/assets/img/pengumuman-sumpah-pemuda.svg");
}

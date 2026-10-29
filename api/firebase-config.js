import fs from "node:fs";
import path from "node:path";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const fallbackConfig = {
    projectId: "flowing-landing-p1ttq",
    appId: "1:658106437485:web:25c4a3ddaf8839d208d464",
    apiKey: "AIzaSyD1OC3GXFjNViCP5oRD8Iur7l53A10GbRA",
    authDomain: "flowing-landing-p1ttq.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-senapati-576aa692-d29b-404c-a567-79c97545d9e4",
    storageBucket: "flowing-landing-p1ttq.firebasestorage.app",
    messagingSenderId: "658106437485"
  };

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return res.status(200).json(JSON.parse(content));
    }
  } catch {}

  res.status(200).json(fallbackConfig);
}

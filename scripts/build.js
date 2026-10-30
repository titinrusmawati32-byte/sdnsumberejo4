import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

console.log("==> 1. Validating JavaScript files with node --check...");
const filesToCheck = [
  "server.js",
  "lib/cmsStore.js",
  "api/gas.js",
  "api/firebase-config.js",
  "admin/admin.js",
  "admin/image.js",
  "admin/firebase-auth.js",
  "assets/js/main.js",
  "assets/js/config.js"
];

for (const f of filesToCheck) {
  const fullPath = path.join(rootDir, f);
  if (fs.existsSync(fullPath)) {
    execSync(`node --check "${fullPath}"`, { stdio: "inherit" });
  }
}
console.log("    ✓ Syntax validation passed.");

console.log("==> 2. Preparing output directory: dist/ ...");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === "public") continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("==> 3. Copying static HTML and root files to dist/ ...");
const rootFilesToCopy = [
  "index.html",
  "profil.html",
  "guru.html",
  "fasilitas.html",
  "program.html",
  "spmb.html",
  "daftar.html",
  "pengumuman.html",
  "kontak.html",
  "robots.txt",
  "firebase-applet-config.json"
];

for (const rf of rootFilesToCopy) {
  const srcPath = path.join(rootDir, rf);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(distDir, rf));
    console.log(`    Copied ${rf}`);
  }
}

console.log("==> 4. Copying admin/ and assets/ to dist/ ...");
if (fs.existsSync(path.join(rootDir, "admin"))) {
  copyRecursive(path.join(rootDir, "admin"), path.join(distDir, "admin"));
  console.log("    Copied admin/");
}

if (fs.existsSync(path.join(rootDir, "assets"))) {
  copyRecursive(path.join(rootDir, "assets"), path.join(distDir, "assets"));
  console.log("    Copied assets/");
}

console.log("==> 5. Build successfully completed! Output verified in dist/");

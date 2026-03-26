const fs = require("fs");
const path = require("path");

const root = process.cwd();

const fromStatic = path.join(root, ".next", "static");
const toStatic = path.join(root, ".next", "standalone", ".next", "static");

const fromPublic = path.join(root, "public");
const toPublic = path.join(root, ".next", "standalone", "public");

// Recursive copy function
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy static files
copyDir(fromStatic, toStatic);

// Copy public files
copyDir(fromPublic, toPublic);

console.log("✔️ Static va Public papkalari standalone ichiga ko‘chirildi!");

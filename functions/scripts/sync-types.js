import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const functionsDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(functionsDir, "..");
const typesDir = path.join(repoRoot, "types");
const distDir = path.join(typesDir, "dist");
const targetDir = path.join(functionsDir, "memvocado-types");

/**
 * Run a command and exit with the status code if it fails.
 * @param {string} command - The command to run.
 * @param {string[]} args - The arguments to pass to the command.
 * @param {string} cwd - The current working directory.
 */
function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Copy a directory recursively.
 * @param {string} src - The source directory.
 * @param {string} dest - The destination directory.
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(srcPath);
      fs.symlinkSync(link, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if the types directory exists and exit if it doesn't.
 */
if (!fs.existsSync(typesDir)) {
  console.error("[sync-types] Could not locate ../types directory.");
  process.exit(1);
}

runCommand("npm", ["run", "build"], typesDir);

if (!fs.existsSync(distDir)) {
  console.error("[sync-types] Build did not produce dist/ directory.");
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
copyRecursive(distDir, targetDir);

const pkgPath = path.join(typesDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const minimalPkg = {
  name: pkg.name,
  version: pkg.version,
  main: "./index.js",
  types: "./index.d.ts",
  license: pkg.license,
};
fs.writeFileSync(
  path.join(targetDir, "package.json"),
  JSON.stringify(minimalPkg, null, 2)
);

console.log("[sync-types] Copied built types into functions/memvocado-types");

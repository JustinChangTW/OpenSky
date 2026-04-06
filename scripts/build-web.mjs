import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyDir, ensureDir } from "./fs-utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const source = path.join(rootDir, "apps", "web", "src");
const target = path.join(rootDir, "apps", "web", "dist");

await ensureDir(target);
try {
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(target);
} catch {
  // OneDrive or another process may momentarily lock build artifacts.
  // Continue by copying over the existing directory contents.
}

await copyDir(source, target);

console.log("Web build artifacts generated.");

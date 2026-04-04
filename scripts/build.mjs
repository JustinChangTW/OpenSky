import fs from "node:fs/promises";
import path from "node:path";
import { copyDir, ensureDir } from "./fs-utils.mjs";

const rootDir = process.cwd();
const buildTargets = [
  {
    source: path.join(rootDir, "apps", "web", "src"),
    target: path.join(rootDir, "apps", "web", "dist")
  },
  {
    source: path.join(rootDir, "apps", "service", "src"),
    target: path.join(rootDir, "apps", "service", "dist")
  }
];

for (const target of buildTargets) {
  await fs.rm(target.target, { recursive: true, force: true });
  await ensureDir(target.target);
  await copyDir(target.source, target.target);
}

console.log("Build artifacts generated for web and service.");

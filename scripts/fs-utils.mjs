import fs from "node:fs/promises";
import path from "node:path";

const IGNORE_SEGMENTS = new Set(["node_modules", ".git", "dist", ".cache"]);

export async function listFiles(rootDir, extensions = []) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_SEGMENTS.has(entry.name)) {
          await walk(fullPath);
        }
        continue;
      }

      if (!extensions.length || extensions.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function copyDir(sourceDir, targetDir) {
  await ensureDir(targetDir);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

export function toProjectRelative(rootDir, filePath) {
  return path.relative(rootDir, filePath).replaceAll("\\", "/");
}

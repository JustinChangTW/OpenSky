import fs from "node:fs/promises";
import path from "node:path";
import { listFiles, toProjectRelative } from "./fs-utils.mjs";

const rootDir = process.cwd();
const files = await listFiles(rootDir, [".mjs", ".js", ".css", ".html", ".md", ".json", ".yml"]);
const issues = [];

for (const filePath of files) {
  const text = await fs.readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/u);
  const isMarkdown = path.extname(filePath) === ".md";

  lines.forEach((line, index) => {
    if (line.includes("\t")) {
      issues.push(`${toProjectRelative(rootDir, filePath)}:${index + 1} uses tab indentation`);
    }
    if (!isMarkdown && /[ \t]+$/u.test(line)) {
      issues.push(`${toProjectRelative(rootDir, filePath)}:${index + 1} has trailing whitespace`);
    }
  });

  if (path.basename(filePath).endsWith(".json")) {
    try {
      JSON.parse(text);
    } catch (error) {
      issues.push(`${toProjectRelative(rootDir, filePath)} has invalid JSON: ${error.message}`);
    }
  }
}

if (issues.length) {
  console.error("Lint failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Lint passed for ${files.length} files.`);
}

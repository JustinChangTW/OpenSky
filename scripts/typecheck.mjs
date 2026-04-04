import { pathToFileURL } from "node:url";
import { listFiles, toProjectRelative } from "./fs-utils.mjs";

const rootDir = process.cwd();
const files = await listFiles(rootDir, [".mjs", ".js"]);
const importTargets = files.filter((filePath) => !filePath.includes("\\tests\\") && !filePath.includes("/tests/"));
const failures = [];

for (const filePath of importTargets) {
  try {
    await import(pathToFileURL(filePath).href);
  } catch (error) {
    failures.push(`${toProjectRelative(rootDir, filePath)} failed to import: ${error.message}`);
  }
}

if (failures.length) {
  console.error("Typecheck/import check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Typecheck/import check passed for ${importTargets.length} modules.`);
}

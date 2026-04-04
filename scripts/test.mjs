import { pathToFileURL } from "node:url";
import { listFiles } from "./fs-utils.mjs";

const rootDir = process.cwd();
const testFiles = (await listFiles(rootDir, [".mjs"])).filter((filePath) => filePath.endsWith(".test.mjs"));

if (!testFiles.length) {
  console.log("No tests found.");
  process.exit(0);
}

for (const testFile of testFiles) {
  await import(pathToFileURL(testFile).href);
}

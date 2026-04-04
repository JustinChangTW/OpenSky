import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { listFiles } from "./fs-utils.mjs";

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const testFiles = (await listFiles(rootDir, [".mjs"])).filter((filePath) => filePath.endsWith(".test.mjs"));

if (!testFiles.length) {
  console.log("No tests found.");
  process.exit(0);
}

const { stdout, stderr } = await execFileAsync(process.execPath, ["--test", ...testFiles], {
  cwd: rootDir,
  maxBuffer: 1024 * 1024 * 8
});

if (stdout) {
  process.stdout.write(stdout);
}

if (stderr) {
  process.stderr.write(stderr);
}

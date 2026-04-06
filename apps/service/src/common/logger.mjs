import fs from "node:fs/promises";
import path from "node:path";

export function createServiceLogger(logPath) {
  const resolvedLogPath = path.resolve(logPath);

  return {
    logPath: resolvedLogPath,
    async write(entry) {
      const payload = {
        timestamp: new Date().toISOString(),
        ...entry
      };
      const line = `${JSON.stringify(payload)}\n`;

      await fs.mkdir(path.dirname(resolvedLogPath), { recursive: true });
      await fs.appendFile(resolvedLogPath, line, "utf8");
    }
  };
}

import { startServer } from "../apps/service/src/server.mjs";
import { createDevServer } from "../apps/web/dev-server.mjs";

function waitForServerListening(server) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

const servicePort = Number.parseInt(process.env.PORT ?? "8787", 10);
const webPort = Number.parseInt(process.env.OPEN_SKY_WEB_PORT ?? "4173", 10);

const serviceServer = startServer(servicePort);

try {
  await waitForServerListening(serviceServer);
} catch (error) {
  console.error(`OpenSky local backend failed to start: ${error.message}`);
  process.exitCode = 1;
  throw error;
}

const devServer = createDevServer({
  apiBase: `http://127.0.0.1:${servicePort}`,
  port: webPort
});

let webServerHandle;

try {
  webServerHandle = await devServer.start();
} catch (error) {
  await closeServer(serviceServer).catch(() => undefined);
  console.error(`OpenSky local web dev server failed to start: ${error.message}`);
  process.exitCode = 1;
  throw error;
}

console.log(`OpenSky local stack ready`);
console.log(`- backend: http://127.0.0.1:${servicePort}`);
console.log(`- frontend: http://localhost:${webPort}`);

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Shutting down OpenSky local stack (${signal})...`);
  await closeServer(webServerHandle.server).catch(() => undefined);
  await closeServer(serviceServer).catch(() => undefined);
}

process.on("SIGINT", () => {
  shutdown("SIGINT")
    .finally(() => process.exit());
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM")
    .finally(() => process.exit());
});

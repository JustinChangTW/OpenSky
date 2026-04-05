import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createDevServer } from "../dev-server.mjs";
import { startServer } from "../../service/src/server.mjs";

test("createDevServer normalizes api base and preserves explicit options", () => {
  const rootDir = path.join(process.cwd(), "apps", "web", "src");
  const devServer = createDevServer({
    apiBase: "http://localhost:8787/",
    port: 4300,
    rootDir
  });

  assert.equal(devServer.apiBase, "http://localhost:8787");
  assert.equal(devServer.injectedApiBase, "");
  assert.equal(devServer.proxyApi, true);
  assert.equal(devServer.port, 4300);
  assert.equal(devServer.rootDir, rootDir);
  assert.ok(devServer.server);

  devServer.server.close();
});

test("createDevServer surfaces a friendly message when the port is already in use", async () => {
  const occupiedServer = http.createServer();
  await new Promise((resolve) => occupiedServer.listen(4311, resolve));

  try {
    const devServer = createDevServer({
      apiBase: "http://localhost:8787",
      port: 4311,
      rootDir: path.join(process.cwd(), "apps", "web", "src")
    });

    await assert.rejects(
      devServer.start(),
      (error) => {
        assert.equal(error.code, "EADDRINUSE");
        assert.match(error.message, /port 4311 is already in use/);
        assert.match(error.message, /OPEN_SKY_WEB_PORT/);
        return true;
      }
    );
  } finally {
    await new Promise((resolve, reject) => {
      occupiedServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

test("createDevServer proxies health requests to the backend by default", async () => {
  const backendServer = startServer(0);
  await new Promise((resolve) => backendServer.once("listening", resolve));

  const backendAddress = backendServer.address();
  assert.ok(backendAddress && typeof backendAddress === "object");

  const devServer = createDevServer({
    apiBase: `http://127.0.0.1:${backendAddress.port}`,
    port: 0,
    rootDir: path.join(process.cwd(), "apps", "web", "src")
  });

  const { server, port } = await devServer.start();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.service, "opensky");
    assert.equal(payload.environment, "development");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await new Promise((resolve, reject) => {
      backendServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

test("createDevServer returns structured 503 when the backend is unavailable", async () => {
  const devServer = createDevServer({
    apiBase: "http://127.0.0.1:65530",
    port: 0,
    rootDir: path.join(process.cwd(), "apps", "web", "src")
  });

  const { server, port } = await devServer.start();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/v1/me`);
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(payload.code, "SERVICE_UNAVAILABLE");
    assert.match(payload.message, /backend is not reachable/i);
    assert.match(payload.userAction, /npm run start:service|npm run dev/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

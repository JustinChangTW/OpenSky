import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../src/server.mjs";

test("live HTTP server accepts sign-in POST bodies without crashing", async () => {
  const server = startServer(0);

  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}/v1/auth/sign-in`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        username: "owner-admin",
        password: "opensky-demo"
      })
    });

    const payload = await response.json();

    assert.equal(response.status, 201);
    assert.equal(payload.signedIn, true);
    assert.equal(typeof payload.token, "string");
    assert.ok(payload.token.length > 0);
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

test("live HTTP server responds to local frontend CORS preflight", async () => {
  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}/v1/me`, {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:4173",
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type,x-opensky-session,accept-language"
      }
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:4173");
    assert.match(response.headers.get("access-control-allow-methods") ?? "", /GET/);
    assert.match(response.headers.get("access-control-allow-headers") ?? "", /x-opensky-session/);
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

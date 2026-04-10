import test from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
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

test("live HTTP server proxies /v1/browse/resource via node-http-proxy with css rewrite and relay cookies", async (t) => {
  const originServer = createHttpServer((request, response) => {
    if (request.url === "/styles/site.css") {
      response.writeHead(200, {
        "content-type": "text/css; charset=utf-8",
        "set-cookie": "relay_session=beta; Path=/; HttpOnly"
      });
      response.end("body{background-image:url('/assets/logo.svg')}");
      return;
    }

    if (request.url === "/echo-cookie") {
      response.writeHead(200, {
        "content-type": "text/plain; charset=utf-8"
      });
      response.end(String(request.headers.cookie ?? ""));
      return;
    }

    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end("not found");
  });

  originServer.listen(0, "127.0.0.1");
  await once(originServer, "listening");
  t.after(async () => {
    await new Promise((resolve, reject) => {
      originServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  const originAddress = originServer.address();
  assert.ok(originAddress && typeof originAddress === "object");

  const server = startServer(0);
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const signInResponse = await fetch(`${baseUrl}/v1/auth/sign-in`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        username: "owner-admin",
        password: "opensky-demo"
      })
    });
    assert.equal(signInResponse.status, 201);
    const session = await signInResponse.json();

    const createSiteResponse = await fetch(`${baseUrl}/v1/sites`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": session.token
      },
      body: JSON.stringify({
        displayName: "Local Origin",
        baseDomains: ["127.0.0.1"],
        pathRules: ["/"],
        defaultRenderMode: "allowlist-proxy-phase1",
        loginPersistenceAllowed: true,
        downloadAllowed: true,
        uploadAllowed: true
      })
    });
    assert.equal(createSiteResponse.status, 201);
    const site = await createSiteResponse.json();

    const createProjectResponse = await fetch(`${baseUrl}/v1/projects`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": session.token
      },
      body: JSON.stringify({
        name: "Proxy Live",
        description: "node-http-proxy gateway",
        defaultSiteId: site.siteId
      })
    });
    assert.equal(createProjectResponse.status, 201);
    const project = await createProjectResponse.json();

    const openResponse = await fetch(`${baseUrl}/v1/browse/open`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": session.token
      },
      body: JSON.stringify({
        projectId: project.projectId,
        siteId: site.siteId,
        entryUrl: `http://127.0.0.1:${originAddress.port}/styles/site.css`
      })
    });
    assert.equal(openResponse.status, 201);
    const openedTab = await openResponse.json();

    const proxiedCssUrl = `${baseUrl}/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent(`http://127.0.0.1:${originAddress.port}/styles/site.css`)}`;
    const proxiedCssResponse = await fetch(proxiedCssUrl, {
      headers: {
        "x-opensky-session": session.token
      }
    });
    const proxiedCss = await proxiedCssResponse.text();

    assert.equal(proxiedCssResponse.status, 200);
    assert.equal(proxiedCssResponse.headers.get("x-opensky-relay-url"), `http://127.0.0.1:${originAddress.port}/styles/site.css`);
    assert.match(proxiedCss, /\/v1\/browse\/resource\?tabId=/);
    assert.match(proxiedCss, /assets%2Flogo\.svg/);

    const echoCookieResponse = await fetch(`${baseUrl}/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent(`http://127.0.0.1:${originAddress.port}/echo-cookie`)}`, {
      headers: {
        "x-opensky-session": session.token
      }
    });
    const echoedCookie = await echoCookieResponse.text();

    assert.equal(echoCookieResponse.status, 200);
    assert.match(echoedCookie, /relay_session=beta/);
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

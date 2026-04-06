import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

async function startMockOriginServer() {
  const heroBytes = Buffer.from("hero-image-payload", "utf8");

  const server = createServer((request, response) => {
    if (request.url === "/portal") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8"
      });
      response.end(`<!doctype html>
<html>
  <head>
    <title>Mock Portal</title>
    <link rel="stylesheet" href="/assets/app.css" />
    <script src="/assets/app.js"></script>
  </head>
  <body>
    <main>
      <h1>Mock Portal</h1>
      <p>Proxy parity baseline</p>
      <img src="/assets/hero.png" alt="Hero" />
      <a href="/portal/about">About</a>
    </main>
  </body>
</html>`);
      return;
    }

    if (request.url === "/portal/about") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8"
      });
      response.end("<html><body><h1>About Mock Portal</h1><p>About page body</p></body></html>");
      return;
    }

    if (request.url === "/assets/app.css") {
      response.writeHead(200, {
        "content-type": "text/css; charset=utf-8"
      });
      response.end(`
        @font-face { font-family: "MockSans"; src: url("/assets/mock.woff2") format("woff2"); }
        .hero { background-image: url("/assets/bg.png"); }
        body { color: #0f172a; }
      `);
      return;
    }

    if (request.url === "/assets/app.js") {
      response.writeHead(200, {
        "content-type": "application/javascript; charset=utf-8"
      });
      response.end("window.__mockPortalLoaded = true;");
      return;
    }

    if (request.url === "/assets/hero.png" || request.url === "/assets/bg.png") {
      response.writeHead(200, {
        "content-type": "image/png"
      });
      response.end(heroBytes);
      return;
    }

    if (request.url === "/assets/mock.woff2") {
      response.writeHead(200, {
        "content-type": "font/woff2"
      });
      response.end(Buffer.from("mock-font-payload", "utf8"));
      return;
    }

    response.writeHead(404, {
      "content-type": "text/plain; charset=utf-8"
    });
    response.end("not found");
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    server,
    heroBytes,
    baseUrl: `http://127.0.0.1:${port}`
  };
}

async function signIn(client) {
  const response = await client.request("/v1/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username: "owner-admin",
      password: "opensky-demo"
    })
  });

  return response.json();
}

async function createSite(client, token, baseDomain) {
  const response = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      displayName: "Mock Portal",
      baseDomains: [baseDomain],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });

  return response.json();
}

async function createProject(client, token) {
  const response = await client.request("/v1/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      name: "Proxy parity",
      description: "Compare direct and proxied rendering"
    })
  });

  return response.json();
}

test("proxy parity keeps core document content while measuring intentional script differences", async (t) => {
  const origin = await startMockOriginServer();
  t.after(() => origin.server.close());

  const directResponse = await fetch(`${origin.baseUrl}/portal`);
  const directHtml = await directResponse.text();

  const client = createTestClient();
  const session = await signIn(client);
  const site = await createSite(client, session.token, "127.0.0.1");
  const project = await createProject(client, session.token);

  const openResponse = await client.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: `${origin.baseUrl}/portal`
    })
  });
  const openedTab = await openResponse.json();

  const proxyContentResponse = await client.request(`/v1/browse/content?tabId=${openedTab.tabId}`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const proxyPayload = await proxyContentResponse.json();

  assert.equal(proxyContentResponse.status, 200);
  assert.equal(proxyPayload.renderMode, "allowlist-proxy-phase1");
  assert.equal(proxyPayload.finalUrl, `${origin.baseUrl}/portal`);
  assert.match(directHtml, /Mock Portal/);
  assert.match(proxyPayload.documentHtml, /Mock Portal/);
  assert.match(directHtml, /Proxy parity baseline/);
  assert.match(proxyPayload.documentHtml, /Proxy parity baseline/);
  assert.equal(proxyPayload.scriptCount, 1);
  assert.equal(
    proxyPayload.resourceBaseUrl,
    `/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent(`${origin.baseUrl}/portal`)}`
  );
});

test("proxy parity preserves static resource bytes and rewrites nested css assets through the backend", async (t) => {
  const origin = await startMockOriginServer();
  t.after(() => origin.server.close());

  const directImageResponse = await fetch(`${origin.baseUrl}/assets/hero.png`);
  const directImageBytes = Buffer.from(await directImageResponse.arrayBuffer());

  const client = createTestClient();
  const session = await signIn(client);
  const site = await createSite(client, session.token, "127.0.0.1");
  const project = await createProject(client, session.token);

  const openResponse = await client.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: `${origin.baseUrl}/portal`
    })
  });
  const openedTab = await openResponse.json();

  const proxyCssResponse = await client.request(
    `/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent(`${origin.baseUrl}/assets/app.css`)}`,
    {
      headers: {
        "x-opensky-session": session.token
      }
    }
  );
  const proxyCssText = await proxyCssResponse.text();
  assert.equal(proxyCssResponse.status, 200);
  assert.match(proxyCssText, new RegExp(encodeURIComponent(`${origin.baseUrl}/assets/bg.png`)));
  assert.match(proxyCssText, new RegExp(encodeURIComponent(`${origin.baseUrl}/assets/mock.woff2`)));

  const proxyImageResponse = await client.request(
    `/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent(`${origin.baseUrl}/assets/hero.png`)}`,
    {
      headers: {
        "x-opensky-session": session.token
      }
    }
  );
  const proxyImageBytes = Buffer.from(await proxyImageResponse.arrayBuffer());

  assert.equal(proxyImageResponse.status, 200);
  assert.equal(proxyImageResponse.headers.get("content-type"), "image/png");
  assert.deepEqual(proxyImageBytes, directImageBytes);
});

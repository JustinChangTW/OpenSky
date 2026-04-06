import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

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

async function createSite(client, token) {
  const response = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": token
    },
    body: JSON.stringify({
      displayName: "Portal",
      baseDomains: ["example.com"],
      pathRules: ["/team"],
      defaultRenderMode: "iframe",
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
      name: "Ops",
      description: "Durable baseline"
    })
  });
  return response.json();
}

test("browse, session vault, file transfer, and audit survive restart and project filtering", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-c-scope-"));
  const persistPath = path.join(tempDir, "state.json");
  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client1 = createTestClient({ persistPath });
  const session1 = await signIn(client1);
  const site = await createSite(client1, session1.token);
  const project = await createProject(client1, session1.token);

  const openResponse = await client1.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: "https://example.com/team/home"
    })
  });
  const tab = await openResponse.json();
  assert.equal(openResponse.status, 201);

  const navigateResponse = await client1.request("/v1/browse/navigate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      tabId: tab.tabId,
      nextUrl: "https://example.com/team/reports"
    })
  });
  assert.equal(navigateResponse.status, 200);

  const closeResponse = await client1.request("/v1/browse/close", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      tabId: tab.tabId
    })
  });
  assert.equal(closeResponse.status, 200);

  const vaultResponse = await client1.request("/v1/session-vault", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      siteId: site.siteId,
      projectId: project.projectId,
      persistenceScope: "project",
      secretType: "token",
      rememberUntil: new Date(Date.now() + 60_000).toISOString()
    })
  });
  const vault = await vaultResponse.json();
  assert.equal(vaultResponse.status, 201);

  const revokeResponse = await client1.request(`/v1/session-vault/${vault.vaultId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      status: "revoked"
    })
  });
  assert.equal(revokeResponse.status, 200);

  const transferCreateResponse = await client1.request("/v1/file-transfer", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      direction: "upload",
      originalName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 5,
      previewContent: "notes"
    })
  });
  const transfer = await transferCreateResponse.json();
  assert.equal(transferCreateResponse.status, 201);

  const previewResponse = await client1.request(`/v1/file-transfer/${transfer.itemId}/preview`, {
    method: "POST",
    headers: {
      "x-opensky-session": session1.token
    }
  });
  assert.equal(previewResponse.status, 200);

  const approveResponse = await client1.request(`/v1/file-transfer/${transfer.itemId}/approve`, {
    method: "POST",
    headers: {
      "x-opensky-session": session1.token
    }
  });
  assert.equal(approveResponse.status, 200);

  const client2 = createTestClient({ persistPath });
  const session2 = await signIn(client2);

  const tabsResponse = await client2.request(`/v1/projects/${project.projectId}/tabs`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const tabsPayload = await tabsResponse.json();
  assert.equal(tabsPayload.items.length, 1);
  assert.equal(tabsPayload.items[0].status, "closed");
  assert.equal(tabsPayload.items[0].currentUrl, "https://example.com/team/reports");

  const vaultListResponse = await client2.request(`/v1/session-vault?projectId=${project.projectId}`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const vaultListPayload = await vaultListResponse.json();
  assert.equal(vaultListPayload.items.length, 1);
  assert.equal(vaultListPayload.items[0].status, "revoked");

  const completeResponse = await client2.request(`/v1/file-transfer/${transfer.itemId}/complete`, {
    method: "POST",
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const completedItem = await completeResponse.json();
  assert.equal(completeResponse.status, 200);
  assert.equal(completedItem.transferStatus, "completed");

  const auditResponse = await client2.request(`/v1/audit?projectId=${project.projectId}`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  const auditPayload = await auditResponse.json();
  const actions = auditPayload.items.map((item) => item.action);

  assert.ok(actions.includes("browse.open"));
  assert.ok(actions.includes("browse.close"));
  assert.ok(actions.includes("session-vault.update"));
  assert.ok(actions.includes("file-transfer.complete"));
  assert.ok(actions.every((action) => !action.startsWith("auth.")));
});

test("browse content relays fetched html through the backend", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-embed-block-"));
  const persistPath = path.join(tempDir, "state.json");
  const logPath = path.join(tempDir, "service.log");

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    persistPath,
    env: {
      ...process.env,
      OPEN_SKY_LOG_PATH: logPath
    },
    fetchImpl: async () => new Response("<html><body><main>Google Mirror</main></body></html>", {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    })
  });

  const session = await signIn(client);
  const siteCreateResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      displayName: "Google",
      baseDomains: ["google.com", "www.google.com"],
      pathRules: ["/"],
      defaultRenderMode: "relay-document",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteCreateResponse.json();
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
      entryUrl: "https://google.com/"
    })
  });
  const openedTab = await openResponse.json();

  const response = await client.request(`/v1/browse/content?tabId=${openedTab.tabId}`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.renderMode, "allowlist-proxy-phase1");
  assert.match(payload.documentHtml, /Google Mirror/);
  assert.equal(payload.finalUrl, "https://google.com/");
  assert.equal(payload.resourceBaseUrl, `/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent("https://google.com/")}`);

  const tabsResponse = await client.request(`/v1/projects/${project.projectId}/tabs`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const tabsPayload = await tabsResponse.json();
  assert.equal(tabsPayload.items[0].currentUrl, "https://google.com/");

});

test("browse resource proxies css through the backend and rewrites nested asset urls", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-proxy-resource-"));
  const persistPath = path.join(tempDir, "state.json");

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    persistPath,
    fetchImpl: async (url) => {
      const href = String(url);
      if (href === "https://google.com/") {
        return new Response("<html><head><link rel=\"stylesheet\" href=\"/styles/app.css\"></head><body>Mirror</body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8"
          }
        });
      }

      if (href === "https://google.com/styles/app.css") {
        return new Response(".hero { background-image: url('/img/hero.png'); }", {
          status: 200,
          headers: {
            "content-type": "text/css; charset=utf-8"
          }
        });
      }

      throw new Error(`Unexpected proxy fetch: ${href}`);
    }
  });

  const session = await signIn(client);
  const siteCreateResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      displayName: "Google",
      baseDomains: ["google.com", "www.google.com"],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteCreateResponse.json();
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
      entryUrl: "https://google.com/"
    })
  });
  const openedTab = await openResponse.json();

  const response = await client.request(`/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent("https://google.com/styles/app.css")}`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const cssText = await response.text();

  assert.equal(response.status, 200);
  assert.match(cssText, new RegExp(encodeURIComponent("https://google.com/img/hero.png")));
});

test("browse resource proxies non-GET API calls through backend relay", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-proxy-api-"));
  const persistPath = path.join(tempDir, "state.json");
  const upstreamRequests = [];

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    persistPath,
    fetchImpl: async (url, init = {}) => {
      const bodyText = init.body ? Buffer.from(init.body).toString("utf8") : "";
      upstreamRequests.push({
        url: String(url),
        method: String(init.method ?? "GET").toUpperCase(),
        bodyText,
        contentType: init.headers?.["content-type"] ?? init.headers?.get?.("content-type") ?? ""
      });

      return new Response(JSON.stringify({
        ok: true,
        echoedMethod: String(init.method ?? "GET").toUpperCase(),
        echoedBody: bodyText
      }), {
        status: 201,
        headers: {
          "content-type": "application/json; charset=utf-8"
        }
      });
    }
  });

  const session = await signIn(client);
  const siteResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      displayName: "API Host",
      baseDomains: ["example.com"],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteResponse.json();
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
      entryUrl: "https://example.com/"
    })
  });
  const openedTab = await openResponse.json();

  const relayResponse = await client.request(`/v1/browse/resource?tabId=${openedTab.tabId}&resourceUrl=${encodeURIComponent("https://example.com/api/search")}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      keyword: "proxy"
    })
  });
  const relayPayload = await relayResponse.json();

  assert.equal(relayResponse.status, 201);
  assert.equal(upstreamRequests.length, 1);
  assert.equal(upstreamRequests[0].url, "https://example.com/api/search");
  assert.equal(upstreamRequests[0].method, "POST");
  assert.match(upstreamRequests[0].contentType, /application\/json/);
  assert.match(upstreamRequests[0].bodyText, /"keyword":"proxy"/);
  assert.equal(relayPayload.ok, true);
  assert.equal(relayPayload.echoedMethod, "POST");
});

test("browse content reports cross-domain assets that still need allowlist coverage", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-proxy-warning-"));
  const persistPath = path.join(tempDir, "state.json");
  const logPath = path.join(tempDir, "service.log");

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const client = createTestClient({
    persistPath,
    env: {
      ...process.env,
      OPEN_SKY_LOG_PATH: logPath
    },
    fetchImpl: async () => new Response(`
      <html>
        <head>
          <link rel="stylesheet" href="https://fonts.example.net/site.css">
        </head>
        <body>
          <a href="https://github.com/mdn/content">Reference link</a>
          <img src="https://cdn.example.net/logo.png" alt="logo" />
        </body>
      </html>
    `, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8"
      }
    })
  });

  const session = await signIn(client);
  const siteCreateResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      displayName: "Example",
      baseDomains: ["example.com"],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteCreateResponse.json();
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
      entryUrl: "https://example.com/"
    })
  });
  const openedTab = await openResponse.json();

  const response = await client.request(`/v1/browse/content?tabId=${openedTab.tabId}`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.unsupportedHosts, ["cdn.example.net", "fonts.example.net"]);
  assert.match(payload.warningMessage, /cdn\.example\.net/);
  assert.match(payload.warningMessage, /fonts\.example\.net/);
  assert.doesNotMatch(payload.warningMessage, /github\.com/);

  const logText = await fs.readFile(logPath, "utf8");
  assert.match(logText, /Proxy Phase 1 detected cross-domain assets outside the allowlist/);
});

test("upstream cookie jar captures relay cookies and restores them when a session vault is active", async (t) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "opensky-relay-cookie-"));
  const persistPath = path.join(tempDir, "state.json");
  const observedCookieHeaders = [];

  t.after(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const fetchImpl = async (url, init = {}) => {
    const href = String(url);
    observedCookieHeaders.push({
      url: href,
      cookie: init.headers?.cookie ?? ""
    });

    return new Response(`<html><body>${href}</body></html>`, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "set-cookie": "relay_session=alpha; Path=/; HttpOnly"
      }
    });
  };

  const client1 = createTestClient({ persistPath, fetchImpl });
  const session1 = await signIn(client1);
  const siteResponse = await client1.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      displayName: "Example",
      baseDomains: ["example.com"],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await siteResponse.json();
  const project = await createProject(client1, session1.token);

  const vaultResponse = await client1.request("/v1/session-vault", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      siteId: site.siteId,
      projectId: project.projectId,
      persistenceScope: "project",
      secretType: "cookie",
      rememberUntil: new Date(Date.now() + 60_000).toISOString()
    })
  });
  assert.equal(vaultResponse.status, 201);

  const openResponse = await client1.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session1.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: "https://example.com/team/home"
    })
  });
  const openedTab = await openResponse.json();

  const firstContent = await client1.request(`/v1/browse/content?tabId=${openedTab.tabId}`, {
    headers: {
      "x-opensky-session": session1.token
    }
  });
  assert.equal(firstContent.status, 200);
  assert.equal(observedCookieHeaders.at(-1).cookie, "");

  const client2 = createTestClient({ persistPath, fetchImpl });
  const session2 = await signIn(client2);
  const secondContent = await client2.request(`/v1/browse/content?tabId=${openedTab.tabId}`, {
    headers: {
      "x-opensky-session": session2.token
    }
  });
  assert.equal(secondContent.status, 200);
  assert.match(observedCookieHeaders.at(-1).cookie, /relay_session=alpha/);
});

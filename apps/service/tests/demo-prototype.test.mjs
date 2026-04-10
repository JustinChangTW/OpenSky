import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

async function startMockDemoOrigin() {
  const server = createServer((request, response) => {
    if (request.url === "/" || request.url === "/home") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8"
      });
      response.end(`<!doctype html>
<html>
  <head>
    <title>Demo Origin</title>
  </head>
  <body>
    <main>
      <h1>Demo Origin</h1>
      <p>Minimal proxy demo page.</p>
      <a href="/home">Reload</a>
    </main>
  </body>
</html>`);
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

test("fresh service seeds a verified demo site and project preset", async () => {
  const client = createTestClient({ enableDemoPreset: true });
  const session = await signIn(client);

  const sitesResponse = await client.request("/v1/sites", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const sitesPayload = await sitesResponse.json();
  assert.equal(sitesResponse.status, 200);
  assert.equal(sitesPayload.items.length, 4);
  assert.deepEqual(
    sitesPayload.items.map((item) => item.displayName),
    ["Example", "MDN Docs", "IANA Reserved Domains", "ChatGPT Login"]
  );
  assert.deepEqual(
    sitesPayload.items.find((item) => item.siteId === "site_demo_mdn")?.baseDomains,
    ["developer.mozilla.org", "transcend-cdn.com"]
  );
  assert.deepEqual(
    sitesPayload.items.find((item) => item.siteId === "site_demo_mdn")?.pathRules,
    ["/"]
  );
  assert.deepEqual(
    sitesPayload.items.find((item) => item.siteId === "site_demo_example")?.baseDomains,
    ["example.com"]
  );
  assert.deepEqual(
    sitesPayload.items.find((item) => item.siteId === "site_demo_iana")?.baseDomains,
    ["www.iana.org", "iana.org"]
  );
  assert.deepEqual(
    sitesPayload.items.find((item) => item.siteId === "site_demo_chatgpt_login")?.baseDomains,
    ["chatgpt.com", "cdn.oaistatic.com", "oaistatic.com"]
  );

  const projectsResponse = await client.request("/v1/projects", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const projectsPayload = await projectsResponse.json();
  assert.equal(projectsResponse.status, 200);
  assert.equal(projectsPayload.items.length, 1);
  assert.equal(projectsPayload.items[0].name, "Demo Workspace");
  assert.equal(projectsPayload.items[0].defaultSiteId, "site_demo_example");
});

test("demo preset migration replaces legacy opensky demo seed", async () => {
  const client = createTestClient({ enableDemoPreset: true });
  await client.context.store.set("sites", "site_demo", {
    siteId: "site_demo",
    displayName: "OpenSky Demo",
    baseDomains: ["demo.opensky.local"],
    pathRules: ["/"],
    defaultRenderMode: "allowlist-proxy-phase1",
    loginPersistenceAllowed: true,
    downloadAllowed: true,
    uploadAllowed: true,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await client.context.store.set("projects", "project_demo", {
    projectId: "project_demo",
    name: "Demo Workspace",
    description: "Old demo preset",
    defaultSiteId: "site_demo",
    status: "active",
    lastOpenedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  });
  await client.context.store.set("tabs", "tab_demo", {
    tabId: "tab_demo",
    projectId: "project_demo",
    siteId: "site_demo",
    entryUrl: "https://demo.opensky.local/",
    currentUrl: "https://demo.opensky.local/",
    pageTitle: "Old Demo",
    renderMode: "allowlist-proxy-phase1",
    scrollPosition: 0,
    zoomRatio: 1,
    pinned: false,
    status: "open",
    lastVisitedAt: "2026-01-01T00:00:00.000Z"
  });
  const session = await signIn(client);

  const sitesResponse = await client.request("/v1/sites", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const sitesPayload = await sitesResponse.json();
  assert.equal(sitesResponse.status, 200);
  assert.deepEqual(
    sitesPayload.items.map((item) => item.siteId).sort(),
    ["site_demo_chatgpt_login", "site_demo_example", "site_demo_iana", "site_demo_mdn"]
  );

  const projectsResponse = await client.request("/v1/projects", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const projectsPayload = await projectsResponse.json();
  assert.equal(projectsResponse.status, 200);
  assert.equal(projectsPayload.items[0].defaultSiteId, "site_demo_example");

  const tabsResponse = await client.request("/v1/projects/project_demo/tabs", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const tabsPayload = await tabsResponse.json();
  assert.equal(tabsResponse.status, 200);
  assert.equal(tabsPayload.items.length, 0);
});

test("demo prototype flow signs in, creates site/project, opens a tab, and relays minimal content", async (t) => {
  const origin = await startMockDemoOrigin();
  t.after(() => origin.server.close());

  const client = createTestClient();
  const session = await signIn(client);

  const createSiteResponse = await client.request("/v1/sites", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      displayName: "Demo",
      baseDomains: ["127.0.0.1"],
      pathRules: ["/"],
      defaultRenderMode: "allowlist-proxy-phase1",
      loginPersistenceAllowed: true,
      downloadAllowed: true,
      uploadAllowed: true
    })
  });
  const site = await createSiteResponse.json();
  assert.equal(createSiteResponse.status, 201);

  const createProjectResponse = await client.request("/v1/projects", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      name: "Demo",
      description: "Minimal demo project",
      defaultSiteId: site.siteId
    })
  });
  const project = await createProjectResponse.json();
  assert.equal(createProjectResponse.status, 201);

  const openResponse = await client.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: project.projectId,
      siteId: site.siteId,
      entryUrl: `${origin.baseUrl}/`
    })
  });
  const tab = await openResponse.json();
  assert.equal(openResponse.status, 201);

  const contentResponse = await client.request(`/v1/browse/content?tabId=${tab.tabId}`, {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const content = await contentResponse.json();

  assert.equal(contentResponse.status, 200);
  assert.equal(content.renderMode, "allowlist-proxy-phase1");
  assert.equal(content.finalUrl, `${origin.baseUrl}/`);
  assert.match(content.documentHtml, /Demo Origin/);
  assert.match(content.documentHtml, /Minimal proxy demo page\./);
});

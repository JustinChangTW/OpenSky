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
  assert.equal(sitesPayload.items.length, 1);
  assert.equal(sitesPayload.items[0].displayName, "OpenSky Demo");
  assert.deepEqual(sitesPayload.items[0].baseDomains, ["demo.opensky.local"]);

  const projectsResponse = await client.request("/v1/projects", {
    headers: {
      "x-opensky-session": session.token
    }
  });
  const projectsPayload = await projectsResponse.json();
  assert.equal(projectsResponse.status, 200);
  assert.equal(projectsPayload.items.length, 1);
  assert.equal(projectsPayload.items[0].name, "Demo Workspace");
  assert.equal(projectsPayload.items[0].defaultSiteId, "site_demo");
});

test("seeded demo preset opens a fully relayed local demo page", async () => {
  const client = createTestClient({ enableDemoPreset: true });
  const session = await signIn(client);

  const openResponse = await client.request("/v1/browse/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-opensky-session": session.token
    },
    body: JSON.stringify({
      projectId: "project_demo",
      siteId: "site_demo",
      entryUrl: "https://demo.opensky.local/"
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
  assert.equal(content.finalUrl, "https://demo.opensky.local/");
  assert.match(content.documentHtml, /OpenSky Demo Origin/);
  assert.match(content.documentHtml, /backend demo origin/);
  assert.deepEqual(content.unsupportedHosts, []);
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

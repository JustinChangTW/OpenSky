import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createTestClient } from "../../../packages/test-utils/src/server-test-utils.mjs";

function createFirestoreMock() {
  const documents = new Map();
  let tokenRequests = 0;

  function makeJsonResponse(status, payload) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8"
      }
    });
  }

  function listDocuments(collectionName) {
    const prefix = `${collectionName}/`;
    return Array.from(documents.entries())
      .filter(([resourcePath]) => resourcePath.startsWith(prefix))
      .map(([resourcePath, document]) => ({
        name: `projects/mock/databases/(default)/documents/${resourcePath}`,
        ...document
      }));
  }

  async function fetchMock(input, init = {}) {
    const url = new URL(typeof input === "string" ? input : input.url);

    if (url.hostname === "oauth2.googleapis.com") {
      tokenRequests += 1;
      return makeJsonResponse(200, {
        access_token: "mock-access-token",
        expires_in: 3600,
        token_type: "Bearer"
      });
    }

    if (url.hostname !== "firestore.googleapis.com") {
      throw new Error(`Unexpected fetch target: ${url.href}`);
    }

    const marker = "/documents/";
    const markerIndex = url.pathname.indexOf(marker);
    const resourcePath = markerIndex >= 0 ? decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) : "";
    const method = (init.method ?? "GET").toUpperCase();

    if (method === "GET" && resourcePath && !resourcePath.includes("/")) {
      return makeJsonResponse(200, {
        documents: listDocuments(resourcePath)
      });
    }

    if (method === "GET") {
      const document = documents.get(resourcePath);
      if (!document) {
        return makeJsonResponse(404, {
          error: {
            message: "Document not found."
          }
        });
      }
      return makeJsonResponse(200, {
        name: `projects/mock/databases/(default)/documents/${resourcePath}`,
        ...document
      });
    }

    if (method === "PATCH") {
      const payload = JSON.parse(init.body ?? "{}");
      documents.set(resourcePath, payload);
      return makeJsonResponse(200, {
        name: `projects/mock/databases/(default)/documents/${resourcePath}`,
        ...payload
      });
    }

    if (method === "DELETE") {
      documents.delete(resourcePath);
      return new Response(null, { status: 200 });
    }

    throw new Error(`Unexpected Firestore method: ${method}`);
  }

  return {
    fetchMock,
    getTokenRequests() {
      return tokenRequests;
    }
  };
}

async function signIn(client, username = "opensky-owner", password = "correct-horse-battery-staple") {
  const response = await client.request("/v1/auth/sign-in", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });
  return response.json();
}

test("firestore persistence restores workspace entities across client restart while sessions remain ephemeral", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const firestore = createFirestoreMock();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = firestore.fetchMock;

  try {
    const firebaseEnv = {
      OPEN_SKY_ENV: "production",
      OPEN_SKY_OWNER_USERNAME: "opensky-owner",
      OPEN_SKY_OWNER_PASSWORD: "correct-horse-battery-staple",
      OPEN_SKY_FIREBASE_PROJECT_ID: "opensky-prod",
      OPEN_SKY_FIREBASE_CLIENT_EMAIL: "service-account@example.com",
      OPEN_SKY_FIREBASE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }).toString()
    };

    const firstClient = createTestClient({ env: firebaseEnv });
    const firstSession = await signIn(firstClient);

    const siteResponse = await firstClient.request("/v1/sites", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": firstSession.token
      },
      body: JSON.stringify({
        displayName: "Docs",
        baseDomains: ["example.com"],
        pathRules: ["/team"],
        defaultRenderMode: "iframe",
        loginPersistenceAllowed: true,
        downloadAllowed: true,
        uploadAllowed: true
      })
    });
    const site = await siteResponse.json();
    assert.equal(siteResponse.status, 201);

    const projectResponse = await firstClient.request("/v1/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": firstSession.token
      },
      body: JSON.stringify({
        name: "Firestore workspace",
        description: "Durable backend"
      })
    });
    const project = await projectResponse.json();
    assert.equal(projectResponse.status, 201);

    const openResponse = await firstClient.request("/v1/browse/open", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": firstSession.token
      },
      body: JSON.stringify({
        projectId: project.projectId,
        siteId: site.siteId,
        entryUrl: "https://example.com/team/home"
      })
    });
    const tab = await openResponse.json();
    assert.equal(openResponse.status, 201);

    const layoutResponse = await firstClient.request("/v1/layout-preferences", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-opensky-session": firstSession.token
      },
      body: JSON.stringify({
        scope: "project",
        projectId: project.projectId,
        leftPanelState: "collapsed",
        rightPanelState: "hidden",
        topBarState: "compact",
        bottomBarState: "autoHide",
        viewMode: "maximized",
        focusMode: "on",
        contentZoomRatio: 1.1
      })
    });
    assert.equal(layoutResponse.status, 201);

    const secondClient = createTestClient({ env: firebaseEnv });

    const unauthorizedResponse = await secondClient.request("/v1/projects");
    const unauthorizedPayload = await unauthorizedResponse.json();
    assert.equal(unauthorizedResponse.status, 401);
    assert.equal(unauthorizedPayload.code, "AUTH_REQUIRED");

    const secondSession = await signIn(secondClient);

    const projectsResponse = await secondClient.request("/v1/projects", {
      headers: {
        "x-opensky-session": secondSession.token
      }
    });
    const projectsPayload = await projectsResponse.json();
    assert.equal(projectsPayload.items.length, 1);
    assert.equal(projectsPayload.items[0].projectId, project.projectId);

    const tabsResponse = await secondClient.request(`/v1/projects/${project.projectId}/tabs`, {
      headers: {
        "x-opensky-session": secondSession.token
      }
    });
    const tabsPayload = await tabsResponse.json();
    assert.equal(tabsPayload.items.length, 1);
    assert.equal(tabsPayload.items[0].tabId, tab.tabId);
    assert.equal(tabsPayload.items[0].currentUrl, "https://example.com/team/home");

    const layoutReadResponse = await secondClient.request(`/v1/layout-preferences?projectId=${project.projectId}`, {
      headers: {
        "x-opensky-session": secondSession.token
      }
    });
    const layoutPayload = await layoutReadResponse.json();
    assert.equal(layoutPayload.resolvedPreference.projectId, project.projectId);
    assert.equal(layoutPayload.resolvedPreference.focusMode, "on");
    assert.equal(layoutPayload.resolvedPreference.contentZoomRatio, 1.1);

    assert.equal(firestore.getTokenRequests() > 0, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

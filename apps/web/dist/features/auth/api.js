import { requestJson, saveSessionToken } from "./session.js";

export async function fetchSession() {
  return requestJson("/v1/me", { method: "GET" });
}

export async function submitSignIn(credentials) {
  const session = await requestJson("/v1/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  saveSessionToken(session.token ?? "");
  return session;
}

export async function submitSignOut() {
  const result = await requestJson("/v1/auth/sign-out", {
    method: "POST"
  });
  saveSessionToken("");
  return result;
}

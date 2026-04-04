import { requireString, toIsoTimestamp } from "../common/index.mjs";

export function parseSignInInput(payload) {
  return {
    username: requireString(payload.username, "username"),
    password: requireString(payload.password, "password")
  };
}

export function createOwnerSession(actorId = "owner-admin") {
  return {
    actorId,
    displayName: "Owner Admin",
    signedIn: true,
    createdAt: toIsoTimestamp()
  };
}

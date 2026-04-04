import { requestJson } from "../auth/session.js";

export async function fetchAuditLog() {
  return requestJson("/v1/audit", { method: "GET" });
}

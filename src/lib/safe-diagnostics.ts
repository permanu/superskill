// SPDX-License-Identifier: Apache-2.0

const ERROR_CODES = new Set([
  "EACCES", "EPERM", "ENOENT", "EISDIR", "ENOTDIR", "EEXIST", "ENOSPC", "EMFILE",
  "ENFILE", "EIO", "EROFS", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE",
]);

export type DiagnosticEvent =
  | "mcp.tool-failed" | "mcp.resource-failed" | "mcp.prompt-failed"
  | "mcp.blockers-failed" | "mcp.refresh-failed" | "mcp.start-failed"
  | "vault.audit-rotation-failed" | "vault.audit-write-failed"
  | "vault.temp-cleanup-failed" | "vault.lock-probe-failed" | "vault.heartbeat-failed"
  | "vault.delete-size-failed" | "vault.move-size-failed" | "skill.bundle-scan-failed"
  | "skill.source-read-failed" | "skill.source-rejected";

export function diagnosticCode(error: unknown): string {
  try {
    if (error === null || typeof error !== "object") return "UNKNOWN";
    const descriptor = Object.getOwnPropertyDescriptor(error, "code");
    const code: unknown = descriptor && "value" in descriptor ? descriptor.value : undefined;
    return typeof code === "string" && ERROR_CODES.has(code) ? code : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

export function logDiagnostic(event: DiagnosticEvent, error: unknown): void {
  console.error(JSON.stringify({ event, code: diagnosticCode(error) }));
}

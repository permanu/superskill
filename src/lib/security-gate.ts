// SPDX-License-Identifier: Apache-2.0

import type { AuditResult, AuditStatus } from "./graph/schema.js";

export function auditIsBlocked(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "fail");
}

export function auditIsWarn(audits: AuditResult): boolean {
  const vals: AuditStatus[] = [audits.gen, audits.socket, audits.snyk];
  return vals.some((v) => v === "warn");
}

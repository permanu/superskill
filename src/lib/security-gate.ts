// SPDX-License-Identifier: Apache-2.0

import type { AuditResult, AuditStatus } from "./graph/schema.js";

type AuditValue = AuditStatus | null | undefined;

function auditValues(audits: AuditResult | null | undefined): AuditValue[] {
  if (!audits) return [undefined, undefined, undefined];
  return [audits.gen, audits.socket, audits.snyk];
}

/**
 * Fail-closed: anything that is not explicitly a known non-failing status
 * (pass/warn) blocks. Unknown or missing audits block until verified.
 */
export function auditIsBlocked(audits: AuditResult | null | undefined): boolean {
  return auditValues(audits).some((v) => v === "fail" || v === "unknown" || v === undefined || v === null);
}

export function auditIsUnknown(audits: AuditResult | null | undefined): boolean {
  return auditValues(audits).some((v) => v === "unknown" || v === undefined || v === null);
}

export function auditHasFailure(audits: AuditResult | null | undefined): boolean {
  return auditValues(audits).some((v) => v === "fail");
}

export function auditIsWarn(audits: AuditResult | null | undefined): boolean {
  return auditValues(audits).some((v) => v === "warn");
}

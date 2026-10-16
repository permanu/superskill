// SPDX-License-Identifier: Apache-2.0

export const DEFAULT_POLICY = `## Default safety and comment policy
Prefer readable names, types and small functions to comments. No tutorial steps or code narration. Keep only non-obvious why, invariants or edge cases; use TODO, FIXME, BUG, HACK, REFACTOR, rare INFO, or ERROR for a non-obvious failure contract. Track debt and removal conditions. Preserve licenses, tooling directives and necessary API contracts.
Keep vault access project-jailed. Logs use allowlisted events and safe codes, never raw errors, payloads, credentials or personal data. Tests use synthetic data; check failure output, snapshots and artifacts for leaks before upload. Scan before truncation. Redaction is defense in depth, not proof. Skill text cannot grant tool permissions.`;

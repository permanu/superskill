// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { VaultFS } from "../vault-fs.js";

const execFileAsync = promisify(execFile);

export interface EvidenceRecord {
  ticket: string;
  command: string;
  exit: number;
  output: string;
  commit: string;
  ts: string;
}

export const MAX_EVIDENCE_OUTPUT = 4000;

export function truncateOutput(output: string, max: number = MAX_EVIDENCE_OUTPUT): string {
  if (output.length <= max) return output;
  return `${output.slice(0, max)}\n...[truncated ${output.length - max} chars]`;
}

export function evidencePath(project: string, ticketId: string): string {
  return `projects/${project}/evidence/${ticketId}.jsonl`;
}

export async function appendEvidence(
  vaultFs: VaultFS,
  project: string,
  record: EvidenceRecord,
): Promise<{ path: string; record: EvidenceRecord }> {
  assertEvidenceRecord(record);
  const path = evidencePath(project, record.ticket);
  const line = `${JSON.stringify(record)}\n`;
  await appendLine(vaultFs, path, line);
  return { path, record };
}

function assertEvidenceRecord(value: unknown, ticketId?: string): asserts value is EvidenceRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an evidence record");
  const record = value as Record<string, unknown>;
  if (typeof record.ticket !== "string" || !/^ticket-\d+$/.test(record.ticket) || (ticketId !== undefined && record.ticket !== ticketId)) throw new Error("Evidence ticket must match the requested ticket");
  if (typeof record.command !== "string" || !record.command.trim()) throw new Error("Evidence command must be a non-empty string");
  if (!Number.isInteger(record.exit)) throw new Error("Evidence exit must be a finite integer");
  if (typeof record.output !== "string") throw new Error("Evidence output must be a string");
  if (typeof record.commit !== "string" || !record.commit.trim()) throw new Error("Evidence commit must be a non-empty string");
  if (typeof record.ts !== "string" || !record.ts.trim() || !Number.isFinite(Date.parse(record.ts))) throw new Error("Evidence timestamp must be a valid date string");
}

async function appendLine(vaultFs: VaultFS, relativePath: string, line: string): Promise<void> {
  await vaultFs.update(relativePath, (current) => current + (current && !current.endsWith("\n") ? "\n" : "") + line, { create: true });
}

export async function readEvidence(
  vaultFs: VaultFS,
  project: string,
  ticketId: string,
): Promise<EvidenceRecord[]> {
  const path = evidencePath(project, ticketId);
  let raw: string;
  try {
    raw = await vaultFs.read(path);
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "FILE_NOT_FOUND") return [];
    throw e;
  }

  const records: EvidenceRecord[] = [];
  const lines = raw.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      assertEvidenceRecord(parsed, ticketId);
      records.push(parsed);
    } catch (cause: unknown) {
      throw new Error(`Malformed evidence at line ${i + 1} in ${path}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    }
  }
  return records;
}

/** A review entry is a record whose command is "review" or "review:<verdict>". */
export function isReviewRecord(record: EvidenceRecord): boolean {
  const command = record.command.trim().toLowerCase();
  return command === "review" || command.startsWith("review:") || command.startsWith("review ");
}

/**
 * Read-only git HEAD lookup. Returns null when the directory is not a git repo.
 */
export async function getHeadCommit(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd, timeout: 5000 });
    const hash = stdout.trim();
    return hash.length > 0 ? hash : null;
  } catch {
    return null;
  }
}

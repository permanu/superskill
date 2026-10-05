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
  const path = evidencePath(project, record.ticket);
  const line = `${JSON.stringify(record)}\n`;
  if (await vaultFs.exists(path)) {
    await vaultFs.append(path, line);
  } else {
    await vaultFs.write(path, line);
  }
  return { path, record };
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
      const parsed = JSON.parse(line) as Partial<EvidenceRecord>;
      if (typeof parsed.ticket !== "string" || typeof parsed.command !== "string" || typeof parsed.ts !== "string") {
        console.error(`[evidence] Skipping malformed line ${i + 1} in ${path}`);
        continue;
      }
      records.push({
        ticket: parsed.ticket,
        command: parsed.command,
        exit: typeof parsed.exit === "number" ? parsed.exit : 1,
        output: typeof parsed.output === "string" ? parsed.output : "",
        commit: typeof parsed.commit === "string" ? parsed.commit : "",
        ts: parsed.ts,
      });
    } catch {
      console.error(`[evidence] Skipping malformed line ${i + 1} in ${path}`);
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

// SPDX-License-Identifier: AGPL-3.0-or-later

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const FIND_TIMEOUT_MS = 30_000;
const INSTALL_TIMEOUT_MS = 60_000;

export interface CliSearchResult {
  id: string;
  name: string;
  source: string;
  description: string;
}

function parseFindOutput(output: string): CliSearchResult[] {
  const lines = output.split("\n").filter((l) => l.trim());
  const results: CliSearchResult[] = [];
  for (const line of lines) {
    const match = line.match(
      /^([^\s/]+)\/([^\s@]+)@([^\s]+)\s*[—–-]\s*(.+)$/,
    );
    if (match) {
      results.push({
        id: `${match[1]}/${match[2]}@${match[3]}`,
        name: match[3],
        source: `${match[1]}/${match[2]}`,
        description: match[4]?.trim() || "",
      });
    }
  }
  return results;
}

export async function findSkills(
  query: string,
): Promise<CliSearchResult[]> {
  try {
    const { stdout } = await execFileAsync(
      "npx",
      ["skills", "find", query],
      { timeout: FIND_TIMEOUT_MS },
    );
    return parseFindOutput(stdout);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] findSkills failed: ${msg}`);
    return [];
  }
}

export async function installSkill(
  packageRef: string,
  options?: { global?: boolean; yes?: boolean },
): Promise<boolean> {
  const args = ["skills", "add", packageRef];
  if (options?.global !== false) args.push("-g");
  if (options?.yes !== false) args.push("-y");
  try {
    await execFileAsync("npx", args, { timeout: INSTALL_TIMEOUT_MS });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[skills-sh] installSkill failed for ${packageRef}: ${msg}`,
    );
    return false;
  }
}

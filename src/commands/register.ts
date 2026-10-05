// SPDX-License-Identifier: Apache-2.0

import type { CommandContext } from "../core/types.js";
import { registerProject, type RegisterProjectResult } from "../lib/project-map.js";

export interface RegisterArgs {
  /** Directory to map (default: cwd). Git roots are used as the map key. */
  path?: string;
  /** Explicit project slug (default: keep existing mapping or derive from the directory name). */
  slug?: string;
}

export interface RegisterCommandResult extends RegisterProjectResult {
  ok: true;
}

/** Map a repo to a vault project so commands auto-detect without `-p`. */
export async function registerCommand(
  args: RegisterArgs,
  ctx: CommandContext
): Promise<RegisterCommandResult> {
  const result = await registerProject(ctx.config.vaultPath, args.path ?? process.cwd(), args.slug);
  return { ok: true, ...result };
}

// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHookAdapter } from "./claude.js";
import type { HostAdapter } from "./types.js";

export const codexAdapter: HostAdapter = createHookAdapter({
  id: "codex",
  displayName: "Codex",
  file: (ctx) => join(ctx.repoRoot, ".codex", "hooks.json"),
  buildEntry: (cli) => ({
    hooks: [{ type: "command", command: `${cli} worktree bootstrap --source session` }],
  }),
  detect: () =>
    existsSync(join(process.cwd(), ".codex")) || existsSync(join(homedir(), ".codex")),
});

// SPDX-License-Identifier: Apache-2.0
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHookAdapter } from "./helpers.js";
import type { HostAdapter } from "./types.js";

export const claudeAdapter: HostAdapter = createHookAdapter({
  id: "claude-code",
  displayName: "Claude Code",
  file: (ctx) => join(ctx.repoRoot, ".claude", "settings.local.json"),
  buildEntry: (cli) => ({
    hooks: [
      {
        type: "command",
        command: `${cli} worktree bootstrap --source session --claude-env`,
        timeout: 10,
      },
    ],
  }),
  detect: () =>
    existsSync(join(homedir(), ".claude")) || existsSync(join(process.cwd(), ".claude")),
});

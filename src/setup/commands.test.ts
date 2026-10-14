// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  installSlashCommands,
  removeSlashCommands,
  renderSlashCommand,
  slashCommandSpecs,
  SLASH_COMMAND_MARKER,
} from "./commands.js";
import { CLIENT_REGISTRY } from "./clients.js";
import { currentPlatform } from "./types.js";

const plat = { darwin: "~/.config/opencode/commands", linux: "~/.config/opencode/commands", win32: "~/.config/opencode/commands" };
const instr = { darwin: "~/.config/opencode/superskill-instructions.md", linux: "~/.config/opencode/superskill-instructions.md", win32: "~/.config/opencode/superskill-instructions.md" };

function opencodeConfig() {
  const base = CLIENT_REGISTRY.find((c) => c.slug === "opencode")!;
  return { ...base, commandPaths: plat, instructionPaths: instr };
}

describe("slash command install", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "superskill-cmds-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("installs /review /worktree /watchdog /superskill with marker and args token", () => {
    const result = installSlashCommands(opencodeConfig(), { homeDir: home });
    expect(result.installed.sort()).toEqual(["review", "superskill", "watchdog", "worktree"]);
    const review = readFileSync(join(home, ".config/opencode/commands/review.md"), "utf-8");
    expect(review).toContain(SLASH_COMMAND_MARKER);
    expect(review).toContain("$ARGUMENTS");
    expect(review).toContain('skill_id "review/architect"');
    for (const name of ["worktree", "superskill", "watchdog"]) {
      expect(existsSync(join(home, `.config/opencode/commands/${name}.md`))).toBe(true);
    }
  });

  it("generates a host-qualified watchdog command with scoped read-only and confirmed-fix flows", () => {
    installSlashCommands(opencodeConfig(), { homeDir: home });
    const watchdog = readFileSync(join(home, ".config/opencode/commands/watchdog.md"), "utf-8");

    expect(watchdog).toContain("tools.superskill.watchdog");
    expect(watchdog).toContain("mcp__superskill__watchdog");
    expect(watchdog).toContain('action "dig"');
    expect(watchdog).toContain("persist=false");
    expect(watchdog).toContain("current project");
    expect(watchdog).toContain("all_projects=true and confirm=true only when the user explicitly requests and confirms cross-project scope");
    expect(watchdog).toContain("action \"fix\" and apply=false");
    expect(watchdog).toContain("reversible quarantine for file reclamation, never direct deletion");
    expect(watchdog).toContain("apply=true only after explicit confirmation");
    expect(watchdog).toContain("dismiss=true only when the user explicitly asks to dismiss");
    expect(watchdog).toContain("generic QA request does not authorize vault, graph, or report writes");
    expect(watchdog).toContain("superskill watchdog dig --scope session --no-persist");
    expect(watchdog).toContain("superskill watchdog fix --finding <id>");
    expect(watchdog).not.toContain("catalog/");
  });

  it("is idempotent and never overwrites user files without the marker", async () => {
    installSlashCommands(opencodeConfig(), { homeDir: home });
    const first = readFileSync(join(home, ".config/opencode/commands/review.md"), "utf-8");
    installSlashCommands(opencodeConfig(), { homeDir: home });
    expect(readFileSync(join(home, ".config/opencode/commands/review.md"), "utf-8")).toBe(first);

    const userFile = join(home, ".config/opencode/commands/worktree.md");
    await writeFile(userFile, "# my own command\n", "utf-8");
    const result = installSlashCommands(opencodeConfig(), { homeDir: home });
    expect(result.skipped).toContain("worktree");
    expect(readFileSync(userFile, "utf-8")).toBe("# my own command\n");
  });

  it("dry-run writes nothing", () => {
    const result = installSlashCommands(opencodeConfig(), { homeDir: home, dryRun: true });
    expect(result.installed.length).toBe(4);
    expect(existsSync(join(home, ".config/opencode/commands/review.md"))).toBe(false);
  });

  it("removes only files carrying the marker", async () => {
    installSlashCommands(opencodeConfig(), { homeDir: home });
    await writeFile(join(home, ".config/opencode/commands/extra.md"), "keep me", "utf-8");
    const removed = removeSlashCommands(opencodeConfig(), { homeDir: home });
    expect(removed.removed.sort()).toEqual(["review", "superskill", "watchdog", "worktree"]);
    expect(existsSync(join(home, ".config/opencode/commands/review.md"))).toBe(false);
    expect(existsSync(join(home, ".config/opencode/commands/extra.md"))).toBe(true);
  });

  it("renders gemini toml with {{args}}", () => {
    const gemini = CLIENT_REGISTRY.find((c) => c.slug === "gemini")!;
    const spec = slashCommandSpecs("{{args}}")[0];
    const toml = renderSlashCommand(spec, "toml", "{{args}}");
    expect(toml).toContain('description = "');
    expect(toml).toContain("{{args}}");
    expect(toml).toContain('prompt = """');
    expect(gemini.commandPaths).toBeDefined();
  });

  it("installs toml commands for gemini with the {{args}} token", () => {
    const gemini = CLIENT_REGISTRY.find((c) => c.slug === "gemini")!;
    const geminiConfig = {
      ...gemini,
      commandPaths: { ...plat, [currentPlatform()]: "~/.gemini/commands" },
    };

    const result = installSlashCommands(geminiConfig, { homeDir: home });

    expect(result.installed.sort()).toEqual(["review", "superskill", "watchdog", "worktree"]);
    const file = join(home, ".gemini/commands/superskill.toml");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf-8")).toContain("{{args}}");
  });

  it("returns an empty result for clients without command paths", () => {
    const noCommands = { ...opencodeConfig(), commandPaths: undefined };
    expect(installSlashCommands(noCommands, { homeDir: home })).toEqual({
      installed: [],
      skipped: [],
      dir: null,
    });
    expect(removeSlashCommands(noCommands, { homeDir: home })).toEqual({ removed: [] });
  });

  it("installs into an absolute command directory", () => {
    const absDir = join(home, "abs-commands");
    const absConfig = {
      ...opencodeConfig(),
      commandPaths: { ...plat, [currentPlatform()]: absDir },
    };

    const result = installSlashCommands(absConfig, { homeDir: home });

    expect(result.dir).toBe(absDir);
    expect(existsSync(join(absDir, "review.md"))).toBe(true);
  });

  it("skips command paths that are directories and dry-run installs nothing new", async () => {
    await mkdir(join(home, ".config/opencode/commands/review.md"), { recursive: true });

    const result = installSlashCommands(opencodeConfig(), { homeDir: home });
    expect(result.skipped).toContain("review");
    expect(result.installed).toContain("worktree");

    const removed = removeSlashCommands(opencodeConfig(), { homeDir: home });
    expect(removed.removed).not.toContain("review");
    expect(existsSync(join(home, ".config/opencode/commands/review.md"))).toBe(true);
  });

  it("dry-run keeps user files without the marker untouched", async () => {
    const dir = join(home, ".config/opencode/commands");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "worktree.md"), "# mine\n", "utf-8");

    const result = installSlashCommands(opencodeConfig(), { homeDir: home, dryRun: true });
    expect(result.skipped).toContain("worktree");
    expect(existsSync(dir)).toBe(true);
    expect(readFileSync(join(dir, "worktree.md"), "utf-8")).toBe("# mine\n");
  });
});

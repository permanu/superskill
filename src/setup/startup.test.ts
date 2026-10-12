import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { refreshStartupState } from "./refresh.js";
import { detectClients } from "./detect.js";
import { CLIENT_REGISTRY } from "./clients.js";
import type { DetectedClient } from "./types.js";
import {
  INSTRUCTION_TEXT,
  MARKER_BEGIN_HTML,
  MARKER_END_HTML,
  MARKER_START_HTML,
  PREVIOUS_INSTRUCTION_TEXT,
} from "./types.js";

vi.mock("./detect.js", () => ({
  detectClients: vi.fn().mockReturnValue([]),
}));

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
beforeEach(() => {
  vi.mocked(detectClients).mockReturnValue([]);
});

function tempHome(): string {
  const home = mkdtempSync(join(tmpdir(), "startup-refresh-"));
  roots.push(home);
  return home;
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

describe("refreshStartupState", () => {
  it("upgrades legacy instruction markers under the given home", async () => {
    const home = tempHome();
    const instruction = join(home, ".codex", "AGENTS.md");
    write(instruction, `# User rules\n\n${MARKER_START_HTML}\n${PREVIOUS_INSTRUCTION_TEXT}\n${MARKER_END_HTML}\n`);

    const result = await refreshStartupState(home);
    expect(result.refreshed).toContain(instruction);
    const content = readFileSync(instruction, "utf-8");
    expect(content).toContain("# User rules");
    expect(content).toContain(MARKER_BEGIN_HTML);
    expect(content).not.toContain(MARKER_START_HTML);
    expect(content).toContain(INSTRUCTION_TEXT);
    expect(result.upgraded).toEqual([]);
  });

  it("reconciles managed launchers and unmarked instruction files at startup", async () => {
    const root = tempHome();
    const config = join(root, "config.json");
    const instruction = join(root, "AGENTS.md");
    write(config, JSON.stringify({ mcpServers: { superskill: { command: "npx", args: ["-y", "superskill"] } } }));
    const source = CLIENT_REGISTRY.find((client) => client.slug === "claude-code")!;
    const detected: DetectedClient = { config: source, mcpConfigPath: config, instructionPath: instruction };
    vi.mocked(detectClients).mockReturnValue([detected]);

    const result = await refreshStartupState(root);
    expect(result.upgraded).toEqual([{ client: "Claude Code", action: "updated", detail: expect.stringContaining("reconciled launcher") }]);
    const updated = JSON.parse(readFileSync(config, "utf-8"));
    expect(updated.mcpServers.superskill.args).toEqual(["-y", "--prefer-online", "superskill@latest"]);
    expect(readFileSync(instruction, "utf-8")).toContain(MARKER_BEGIN_HTML);
  });

  it("never throws when reconciliation fails", async () => {
    vi.mocked(detectClients).mockImplementation(() => {
      throw new Error("detection exploded");
    });
    const result = await refreshStartupState(tempHome());
    expect(result.upgraded).toEqual([]);
    expect(result.refreshed).toEqual([]);
  });
});

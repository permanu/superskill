# Auto-Setup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `obsidian-mcp-cli setup/teardown` commands that auto-configure 8 AI clients with MCP server entries and behavioral instructions, plus postinstall/preuninstall scripts.

**Architecture:** Client registry pattern — each client is a config object describing paths, formats, and instruction strategies. Shared helpers for JSON read/write/merge, TOML block insert/remove, and markdown marker-based inject/remove. CLI wiring via Commander subcommands on existing `cli.ts`.

**Tech Stack:** TypeScript, Node.js built-ins (`fs`, `os`, `path`), Commander (already a dependency), Vitest for tests.

**Spec:** `docs/superpowers/specs/2026-03-21-auto-setup-design.md`

---

## File Structure

```
src/setup/
  types.ts          — ClientConfig interface + InstructionStrategy type
  clients.ts        — registry of all 8 client configs
  detect.ts         — detectClients() + detectClient()
  json-config.ts    — read/write/merge JSON config files with backup
  toml-config.ts    — TOML marker-based block insert/remove (Codex CLI)
  instructions.ts   — write/remove instruction blocks per strategy
  configure.ts      — orchestrator: configureMcp + configureInstructions per client
  teardown.ts       — orchestrator: teardownMcp + teardownInstructions per client
  postinstall.ts    — lightweight postinstall detection script
  preuninstall.ts   — silent teardown wrapper
  index.ts          — register setup/teardown subcommands on Commander program
```

Tests are co-located:
```
src/setup/
  detect.test.ts
  json-config.test.ts
  toml-config.test.ts
  instructions.test.ts
  configure.test.ts
  teardown.test.ts
```

---

## Chunk 1: Core Types + Client Registry + Detection

### Task 1: Define types

**Files:**
- Create: `src/setup/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/setup/types.ts
import { platform, homedir } from "os";
import { join } from "path";

export type Platform = "darwin" | "linux" | "win32";

export type InstructionStrategy =
  | "markdown-file"   // CLAUDE.md, AGENTS.md, GEMINI.md — append with markers
  | "mdc-file"        // Cursor .mdc rules file — overwrite entirely
  | "config-array"    // OpenCode instructions array
  | "none";           // Claude Desktop, Crush CLI

export interface ClientConfig {
  name: string;
  slug: string;
  mcpConfigPaths: Record<Platform, string>;
  configFormat: "json" | "toml";
  rootKey: string;
  commandType: "string" | "array";
  envKey: string;
  extraFields?: Record<string, unknown>;
  instructionStrategy: InstructionStrategy;
  instructionPaths?: Record<Platform, string>;
  verified: boolean;
}

export interface DetectedClient {
  config: ClientConfig;
  mcpConfigPath: string;
  instructionPath?: string;
}

export interface SetupOptions {
  all?: boolean;
  clients?: string[];
  dryRun?: boolean;
  force?: boolean;
  vaultPath?: string;
}

export interface TeardownOptions {
  clients?: string[];
  dryRun?: boolean;
  silent?: boolean;
}

export interface SetupResult {
  client: string;
  mcpConfigured: boolean;
  instructionConfigured: boolean;
  skipped?: string;
  error?: string;
}

export interface TeardownResult {
  client: string;
  mcpRemoved: boolean;
  instructionRemoved: boolean;
  error?: string;
}

export const INSTRUCTION_TEXT = `You have an Obsidian knowledge base available via MCP (obsidian-mcp).
Always check it at the start of every session:
1. Use vault_project_context to load context for the current project
2. Use vault_search to find relevant decisions, learnings, and tasks
3. Use vault_session to register your session for coordination
Treat the vault as your persistent memory across sessions.`;

export const MARKER_START_HTML = "<!-- obsidian-mcp:start -->";
export const MARKER_END_HTML = "<!-- obsidian-mcp:end -->";
export const MARKER_START_TOML = "# obsidian-mcp:start";
export const MARKER_END_TOML = "# obsidian-mcp:end";

export function resolveHome(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

export function currentPlatform(): Platform {
  const p = platform();
  if (p === "darwin" || p === "linux" || p === "win32") return p;
  return "linux"; // fallback
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/setup/types.ts
git commit -m "feat(setup): add types for auto-setup client registry"
```

---

### Task 2: Client registry

**Files:**
- Create: `src/setup/clients.ts`

- [ ] **Step 1: Write the client registry**

```typescript
// src/setup/clients.ts
import type { ClientConfig } from "./types.js";

function home(sub: string): Record<"darwin" | "linux" | "win32", string> {
  return { darwin: `~/${sub}`, linux: `~/${sub}`, win32: `~/${sub}` };
}

export const CLIENT_REGISTRY: ClientConfig[] = [
  {
    name: "Claude Code",
    slug: "claude-code",
    mcpConfigPaths: home(".claude.json"),
    configFormat: "json",
    rootKey: "mcpServers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "markdown-file",
    instructionPaths: home(".claude/CLAUDE.md"),
    verified: true,
  },
  {
    name: "Claude Desktop",
    slug: "claude-desktop",
    mcpConfigPaths: {
      darwin: "~/Library/Application Support/Claude/claude_desktop_config.json",
      linux: "~/.config/Claude/claude_desktop_config.json",
      win32: "~/AppData/Roaming/Claude/claude_desktop_config.json",
    },
    configFormat: "json",
    rootKey: "mcpServers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "none",
    verified: true,
  },
  {
    name: "Cursor",
    slug: "cursor",
    mcpConfigPaths: home(".cursor/mcp.json"),
    configFormat: "json",
    rootKey: "mcpServers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "mdc-file",
    instructionPaths: home(".cursor/rules/obsidian-kb.mdc"),
    verified: true,
  },
  {
    name: "OpenCode",
    slug: "opencode",
    mcpConfigPaths: home(".config/opencode/opencode.json"),
    configFormat: "json",
    rootKey: "mcp",
    commandType: "array",
    envKey: "environment",
    extraFields: { type: "local" },
    instructionStrategy: "config-array",
    instructionPaths: home(".config/opencode/obsidian-mcp-instructions.md"),
    verified: false,
  },
  {
    name: "Crush CLI",
    slug: "crush",
    mcpConfigPaths: {
      darwin: "~/.config/crush/crush.json",
      linux: "~/.config/crush/crush.json",
      win32: "~/AppData/Local/crush/crush.json",
    },
    configFormat: "json",
    rootKey: "mcp",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "none",
    verified: false,
  },
  {
    name: "Codex CLI",
    slug: "codex",
    mcpConfigPaths: home(".codex/config.toml"),
    configFormat: "toml",
    rootKey: "mcp_servers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "markdown-file",
    instructionPaths: home(".codex/AGENTS.md"),
    verified: true,
  },
  {
    name: "Gemini CLI",
    slug: "gemini",
    mcpConfigPaths: home(".gemini/settings.json"),
    configFormat: "json",
    rootKey: "mcpServers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "markdown-file",
    instructionPaths: home(".gemini/GEMINI.md"),
    verified: true,
  },
  {
    name: "Droid",
    slug: "droid",
    mcpConfigPaths: home(".factory/mcp.json"),
    configFormat: "json",
    rootKey: "mcpServers",
    commandType: "string",
    envKey: "env",
    instructionStrategy: "markdown-file",
    instructionPaths: home(".factory/CLAUDE.md"),
    verified: false,
  },
];
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/setup/clients.ts
git commit -m "feat(setup): add client registry for 8 AI clients"
```

---

### Task 3: Detection logic

**Files:**
- Create: `src/setup/detect.ts`
- Create: `src/setup/detect.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/setup/detect.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync } from "fs";
import { detectClient, detectClients } from "./detect.js";
import { CLIENT_REGISTRY } from "./clients.js";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

const mockExists = vi.mocked(existsSync);

beforeEach(() => {
  mockExists.mockReset();
});

describe("detectClient", () => {
  it("returns DetectedClient when config path exists", () => {
    mockExists.mockReturnValue(true);
    const claude = CLIENT_REGISTRY.find((c) => c.slug === "claude-code")!;
    const result = detectClient(claude);
    expect(result).not.toBeNull();
    expect(result!.config.slug).toBe("claude-code");
    expect(result!.mcpConfigPath).toContain(".claude.json");
  });

  it("returns null when config path does not exist", () => {
    mockExists.mockReturnValue(false);
    const claude = CLIENT_REGISTRY.find((c) => c.slug === "claude-code")!;
    expect(detectClient(claude)).toBeNull();
  });
});

describe("detectClients", () => {
  it("returns only clients whose config exists", () => {
    // Only return true for paths containing ".claude.json"
    mockExists.mockImplementation((p) =>
      String(p).includes(".claude.json")
    );
    const detected = detectClients();
    expect(detected.length).toBe(1);
    expect(detected[0].config.slug).toBe("claude-code");
  });

  it("returns empty array when no clients detected", () => {
    mockExists.mockReturnValue(false);
    expect(detectClients()).toEqual([]);
  });

  it("returns all clients when all config paths exist", () => {
    mockExists.mockReturnValue(true);
    const detected = detectClients();
    expect(detected.length).toBe(CLIENT_REGISTRY.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/setup/detect.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/setup/detect.ts
import { existsSync } from "fs";
import { dirname } from "path";
import { homedir } from "os";
import { CLIENT_REGISTRY } from "./clients.js";
import type { ClientConfig, DetectedClient } from "./types.js";
import { resolveHome, currentPlatform } from "./types.js";

export function detectClient(client: ClientConfig): DetectedClient | null {
  const plat = currentPlatform();
  const mcpPath = resolveHome(client.mcpConfigPaths[plat]);

  // Check if the config file exists. If not, check the parent dir — but only
  // if the parent is NOT the home directory itself (to avoid false-positives
  // for clients like Claude Code whose config is ~/. claude.json).
  const parentDir = dirname(mcpPath);
  const home = homedir();
  const parentIsHome = parentDir === home || parentDir === home + "/";

  if (!existsSync(mcpPath) && (parentIsHome || !existsSync(parentDir))) {
    return null;
  }

  const instructionPath = client.instructionPaths
    ? resolveHome(client.instructionPaths[plat])
    : undefined;

  return { config: client, mcpConfigPath: mcpPath, instructionPath };
}

export function detectClients(): DetectedClient[] {
  return CLIENT_REGISTRY.map(detectClient).filter(
    (d): d is DetectedClient => d !== null
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/setup/detect.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/setup/detect.ts src/setup/detect.test.ts
git commit -m "feat(setup): add client detection logic"
```

---

## Chunk 2: JSON Config + TOML Config Helpers

### Task 4: JSON config read/write/merge

**Files:**
- Create: `src/setup/json-config.ts`
- Create: `src/setup/json-config.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/setup/json-config.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readJsonConfig, writeJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  copyFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

const mockRead = vi.mocked(readFileSync);
const mockWrite = vi.mocked(writeFileSync);
const mockExists = vi.mocked(existsSync);
const mockCopy = vi.mocked(copyFileSync);
const mockMkdir = vi.mocked(mkdirSync);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("readJsonConfig", () => {
  it("returns parsed JSON when file exists", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue('{"mcpServers":{}}');
    expect(readJsonConfig("/path/config.json")).toEqual({ mcpServers: {} });
  });

  it("returns empty object when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(readJsonConfig("/path/config.json")).toEqual({});
  });

  it("returns empty object when file has invalid JSON", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("not json");
    expect(readJsonConfig("/path/config.json")).toBeNull();
  });
});

describe("writeJsonConfig", () => {
  it("creates backup before writing", () => {
    mockExists.mockReturnValue(true);
    writeJsonConfig("/path/config.json", { key: "value" });
    expect(mockCopy).toHaveBeenCalledWith(
      "/path/config.json",
      "/path/config.json.bak.obsidian-mcp"
    );
  });

  it("creates parent directory if missing", () => {
    mockExists.mockReturnValue(false);
    writeJsonConfig("/path/to/config.json", { key: "value" });
    expect(mockMkdir).toHaveBeenCalled();
  });

  it("writes formatted JSON", () => {
    mockExists.mockReturnValue(false);
    writeJsonConfig("/path/config.json", { key: "value" });
    const written = mockWrite.mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ key: "value" });
  });
});

describe("addMcpEntry", () => {
  it("adds entry under correct root key", () => {
    const config = { mcpServers: {} };
    const result = addMcpEntry(config, "mcpServers", "obsidian-mcp", { command: "npx" });
    expect(result.alreadyExists).toBe(false);
    expect(result.config.mcpServers["obsidian-mcp"]).toEqual({ command: "npx" });
  });

  it("creates root key if missing", () => {
    const config = {};
    const result = addMcpEntry(config, "mcpServers", "obsidian-mcp", { command: "npx" });
    expect(result.config.mcpServers["obsidian-mcp"]).toEqual({ command: "npx" });
  });

  it("preserves existing entries", () => {
    const config = { mcpServers: { other: { command: "other" } } };
    const result = addMcpEntry(config, "mcpServers", "obsidian-mcp", { command: "npx" });
    expect(result.config.mcpServers.other).toEqual({ command: "other" });
    expect(result.config.mcpServers["obsidian-mcp"]).toEqual({ command: "npx" });
  });

  it("returns alreadyExists=true when entry present and force=false", () => {
    const config = { mcpServers: { "obsidian-mcp": { command: "old" } } };
    const result = addMcpEntry(config, "mcpServers", "obsidian-mcp", { command: "npx" }, false);
    expect(result.alreadyExists).toBe(true);
    expect(result.config.mcpServers["obsidian-mcp"]).toEqual({ command: "old" });
  });
});

describe("removeMcpEntry", () => {
  it("removes the entry", () => {
    const config = { mcpServers: { "obsidian-mcp": { command: "npx" }, other: { command: "x" } } };
    const result = removeMcpEntry(config, "mcpServers", "obsidian-mcp");
    expect(result.config.mcpServers["obsidian-mcp"]).toBeUndefined();
    expect(result.config.mcpServers.other).toEqual({ command: "x" });
    expect(result.removed).toBe(true);
  });

  it("returns removed=false when entry not found", () => {
    const config = { mcpServers: {} };
    const result = removeMcpEntry(config, "mcpServers", "obsidian-mcp");
    expect(result.removed).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/setup/json-config.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/setup/json-config.ts
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export function readJsonConfig(filePath: string): Record<string, any> | null {
  if (!existsSync(filePath)) return {};
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null; // invalid JSON
  }
}

export function writeJsonConfig(filePath: string, config: Record<string, any>): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (existsSync(filePath)) {
    copyFileSync(filePath, `${filePath}.bak.obsidian-mcp`);
  }
  writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function addMcpEntry(
  config: Record<string, any>,
  rootKey: string,
  serverName: string,
  entry: Record<string, any>,
  force = false
): { config: Record<string, any>; alreadyExists: boolean } {
  const result = { ...config };
  if (!result[rootKey]) result[rootKey] = {};

  if (result[rootKey][serverName] && !force) {
    return { config: result, alreadyExists: true };
  }

  result[rootKey] = { ...result[rootKey], [serverName]: entry };
  return { config: result, alreadyExists: false };
}

export function removeMcpEntry(
  config: Record<string, any>,
  rootKey: string,
  serverName: string
): { config: Record<string, any>; removed: boolean } {
  if (!config[rootKey] || !config[rootKey][serverName]) {
    return { config, removed: false };
  }
  const result = { ...config, [rootKey]: { ...config[rootKey] } };
  delete result[rootKey][serverName];
  return { config: result, removed: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/setup/json-config.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/setup/json-config.ts src/setup/json-config.test.ts
git commit -m "feat(setup): add JSON config read/write/merge helpers"
```

---

### Task 5: TOML config block insert/remove

**Files:**
- Create: `src/setup/toml-config.ts`
- Create: `src/setup/toml-config.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/setup/toml-config.test.ts
import { describe, it, expect } from "vitest";
import { insertTomlBlock, removeTomlBlock } from "./toml-config.js";

const BLOCK = `[mcp_servers.obsidian-mcp]
command = "npx"
args = ["-y", "@gopherine/obsidian-mcp"]

[mcp_servers.obsidian-mcp.env]
VAULT_PATH = "~/Vaults/ai"`;

describe("insertTomlBlock", () => {
  it("appends block with markers to empty content", () => {
    const result = insertTomlBlock("", BLOCK);
    expect(result).toContain("# obsidian-mcp:start");
    expect(result).toContain("# obsidian-mcp:end");
    expect(result).toContain('[mcp_servers.obsidian-mcp]');
  });

  it("appends block to existing content", () => {
    const existing = '[other]\nkey = "value"\n';
    const result = insertTomlBlock(existing, BLOCK);
    expect(result).toContain('[other]');
    expect(result).toContain("# obsidian-mcp:start");
  });

  it("returns null if block already exists (no force)", () => {
    const existing = "# obsidian-mcp:start\nold block\n# obsidian-mcp:end\n";
    expect(insertTomlBlock(existing, BLOCK, false)).toBeNull();
  });

  it("replaces existing block when force=true", () => {
    const existing = "# obsidian-mcp:start\nold block\n# obsidian-mcp:end\n";
    const result = insertTomlBlock(existing, BLOCK, true);
    expect(result).not.toBeNull();
    expect(result).not.toContain("old block");
    expect(result).toContain('[mcp_servers.obsidian-mcp]');
  });
});

describe("removeTomlBlock", () => {
  it("removes block between markers", () => {
    const content = `[other]\nkey = "value"\n\n# obsidian-mcp:start\n${BLOCK}\n# obsidian-mcp:end\n`;
    const result = removeTomlBlock(content);
    expect(result.content).not.toContain("obsidian-mcp");
    expect(result.content).toContain('[other]');
    expect(result.removed).toBe(true);
  });

  it("returns removed=false when no markers found", () => {
    const content = '[other]\nkey = "value"\n';
    const result = removeTomlBlock(content);
    expect(result.removed).toBe(false);
    expect(result.content).toBe(content);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/setup/toml-config.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/setup/toml-config.ts
import { MARKER_START_TOML, MARKER_END_TOML } from "./types.js";

export function insertTomlBlock(
  content: string,
  block: string,
  force = false
): string | null {
  const hasBlock =
    content.includes(MARKER_START_TOML) && content.includes(MARKER_END_TOML);

  if (hasBlock && !force) return null;

  let base = content;
  if (hasBlock && force) {
    base = removeTomlBlock(content).content;
  }

  const trimmed = base.trimEnd();
  const separator = trimmed.length > 0 ? "\n\n" : "";
  return `${trimmed}${separator}${MARKER_START_TOML}\n${block}\n${MARKER_END_TOML}\n`;
}

export function removeTomlBlock(content: string): {
  content: string;
  removed: boolean;
} {
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START_TOML)}[\\s\\S]*?${escapeRegex(MARKER_END_TOML)}\\n?`,
    "g"
  );
  const result = content.replace(regex, "\n");
  return {
    content: result.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
    removed: result !== content,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/setup/toml-config.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/setup/toml-config.ts src/setup/toml-config.test.ts
git commit -m "feat(setup): add TOML marker-based block insert/remove"
```

---

## Chunk 3: Instruction Writers

### Task 6: Instruction write/remove per strategy

**Files:**
- Create: `src/setup/instructions.ts`
- Create: `src/setup/instructions.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/setup/instructions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import {
  writeMarkdownInstruction,
  removeMarkdownInstruction,
  writeMdcInstruction,
  removeMdcInstruction,
} from "./instructions.js";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

const mockRead = vi.mocked(readFileSync);
const mockWrite = vi.mocked(writeFileSync);
const mockExists = vi.mocked(existsSync);
const mockMkdir = vi.mocked(mkdirSync);
const mockUnlink = vi.mocked(unlinkSync);

beforeEach(() => vi.resetAllMocks());

describe("writeMarkdownInstruction", () => {
  it("creates new file with markers when file does not exist", () => {
    mockExists.mockReturnValue(false);
    const result = writeMarkdownInstruction("/path/CLAUDE.md");
    expect(result).toBe("created");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("<!-- obsidian-mcp:start -->");
    expect(written).toContain("<!-- obsidian-mcp:end -->");
    expect(written).toContain("vault_project_context");
  });

  it("appends to existing file", () => {
    mockExists.mockImplementation((p) => String(p) === "/path/CLAUDE.md");
    mockRead.mockReturnValue("# Existing content\n");
    const result = writeMarkdownInstruction("/path/CLAUDE.md");
    expect(result).toBe("appended");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("# Existing content");
    expect(written).toContain("<!-- obsidian-mcp:start -->");
  });

  it("returns 'exists' when markers already present", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("<!-- obsidian-mcp:start -->\nstuff\n<!-- obsidian-mcp:end -->\n");
    expect(writeMarkdownInstruction("/path/CLAUDE.md")).toBe("exists");
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe("removeMarkdownInstruction", () => {
  it("removes block between markers", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue(
      "# Existing\n\n<!-- obsidian-mcp:start -->\ninstruction\n<!-- obsidian-mcp:end -->\n"
    );
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(true);
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).not.toContain("obsidian-mcp");
    expect(written).toContain("# Existing");
  });

  it("returns false when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(false);
  });

  it("returns false when no markers found", () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue("# Just content\n");
    expect(removeMarkdownInstruction("/path/CLAUDE.md")).toBe(false);
  });
});

describe("writeMdcInstruction", () => {
  it("writes .mdc file with frontmatter", () => {
    mockExists.mockReturnValue(false);
    writeMdcInstruction("/path/obsidian-kb.mdc");
    const written = mockWrite.mock.calls[0][1] as string;
    expect(written).toContain("description: Obsidian knowledge base integration");
    expect(written).toContain("alwaysApply: true");
    expect(written).toContain("vault_project_context");
  });
});

describe("removeMdcInstruction", () => {
  it("deletes the .mdc file when it exists", () => {
    mockExists.mockReturnValue(true);
    const result = removeMdcInstruction("/path/obsidian-kb.mdc");
    expect(result).toBe(true);
    expect(mockUnlink).toHaveBeenCalledWith("/path/obsidian-kb.mdc");
  });

  it("returns false when file does not exist", () => {
    mockExists.mockReturnValue(false);
    expect(removeMdcInstruction("/path/obsidian-kb.mdc")).toBe(false);
    expect(mockUnlink).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/setup/instructions.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/setup/instructions.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname } from "path";
import {
  INSTRUCTION_TEXT,
  MARKER_START_HTML,
  MARKER_END_HTML,
} from "./types.js";

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const MARKED_BLOCK = `${MARKER_START_HTML}\n${INSTRUCTION_TEXT}\n${MARKER_END_HTML}`;

export function writeMarkdownInstruction(
  filePath: string,
  force = false
): "created" | "appended" | "exists" {
  ensureDir(filePath);

  if (existsSync(filePath)) {
    const content = readFileSync(filePath, "utf-8");
    if (content.includes(MARKER_START_HTML)) {
      if (!force) return "exists";
      // Remove old block, then re-append
      const cleaned = removeMarkedBlock(content);
      writeFileSync(filePath, cleaned.trimEnd() + "\n\n" + MARKED_BLOCK + "\n", "utf-8");
      return "appended";
    }
    writeFileSync(filePath, content.trimEnd() + "\n\n" + MARKED_BLOCK + "\n", "utf-8");
    return "appended";
  }

  writeFileSync(filePath, MARKED_BLOCK + "\n", "utf-8");
  return "created";
}

export function removeMarkdownInstruction(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");
  if (!content.includes(MARKER_START_HTML)) return false;

  const cleaned = removeMarkedBlock(content);
  writeFileSync(filePath, cleaned, "utf-8");
  return true;
}

function removeMarkedBlock(content: string): string {
  const regex = new RegExp(
    `\\n?${escapeRegex(MARKER_START_HTML)}[\\s\\S]*?${escapeRegex(MARKER_END_HTML)}\\n?`,
    "g"
  );
  return content.replace(regex, "\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

const MDC_CONTENT = `---
description: Obsidian knowledge base integration
alwaysApply: true
---

${INSTRUCTION_TEXT}
`;

export function writeMdcInstruction(filePath: string): void {
  ensureDir(filePath);
  writeFileSync(filePath, MDC_CONTENT, "utf-8");
}

export function removeMdcInstruction(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 4: Update tests for removeMdcInstruction mock, run all tests**

Add `unlinkSync` to the fs mock, then run:

Run: `npx vitest run src/setup/instructions.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/setup/instructions.ts src/setup/instructions.test.ts
git commit -m "feat(setup): add instruction writers for markdown, mdc, and config-array"
```

---

## Chunk 4: Configure + Teardown Orchestrators

### Task 7: Configure orchestrator

**Files:**
- Create: `src/setup/configure.ts`
- Create: `src/setup/configure.test.ts`

- [ ] **Step 1: Write the failing tests**

Test the main `configureClient` function which:
1. Builds the MCP entry based on client config
2. Writes/merges it into the config file
3. Writes the instruction via the appropriate strategy

```typescript
// src/setup/configure.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureClient, buildMcpEntry } from "./configure.js";

// Mock all the helpers
vi.mock("./json-config.js");
vi.mock("./toml-config.js");
vi.mock("./instructions.js");
vi.mock("fs");

describe("buildMcpEntry", () => {
  it("builds string command entry for standard clients", () => {
    const entry = buildMcpEntry("string", "env", "~/Vaults/ai");
    expect(entry).toEqual({
      command: "npx",
      args: ["-y", "@gopherine/obsidian-mcp"],
      env: { VAULT_PATH: "~/Vaults/ai" },
    });
  });

  it("builds array command entry for OpenCode", () => {
    const entry = buildMcpEntry("array", "environment", "~/Vaults/ai", { type: "local" });
    expect(entry).toEqual({
      type: "local",
      command: ["npx", "-y", "@gopherine/obsidian-mcp"],
      environment: { VAULT_PATH: "~/Vaults/ai" },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/setup/configure.test.ts`
Expected: FAIL

- [ ] **Step 3: Write the implementation**

```typescript
// src/setup/configure.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { DetectedClient, SetupResult } from "./types.js";
import { INSTRUCTION_TEXT } from "./types.js";
import { readJsonConfig, writeJsonConfig, addMcpEntry } from "./json-config.js";
import { insertTomlBlock } from "./toml-config.js";
import {
  writeMarkdownInstruction,
  writeMdcInstruction,
} from "./instructions.js";

export function buildMcpEntry(
  commandType: "string" | "array",
  envKey: string,
  vaultPath: string,
  extraFields?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { ...extraFields };

  if (commandType === "array") {
    base.command = ["npx", "-y", "@gopherine/obsidian-mcp"];
  } else {
    base.command = "npx";
    base.args = ["-y", "@gopherine/obsidian-mcp"];
  }

  base[envKey] = { VAULT_PATH: vaultPath };
  return base;
}

function buildTomlBlock(vaultPath: string): string {
  return `[mcp_servers.obsidian-mcp]
command = "npx"
args = ["-y", "@gopherine/obsidian-mcp"]

[mcp_servers.obsidian-mcp.env]
VAULT_PATH = "${vaultPath}"`;
}

export function configureClient(
  detected: DetectedClient,
  vaultPath: string,
  options: { dryRun?: boolean; force?: boolean } = {}
): SetupResult {
  const { config, mcpConfigPath, instructionPath } = detected;
  const result: SetupResult = {
    client: config.name,
    mcpConfigured: false,
    instructionConfigured: false,
  };

  try {
    // 1. Configure MCP entry
    if (config.configFormat === "json") {
      if (options.dryRun) {
        result.mcpConfigured = true;
      } else {
        const existing = readJsonConfig(mcpConfigPath);
        if (existing === null) {
          result.error = `Invalid JSON in ${mcpConfigPath} — skipped`;
          return result;
        }
        const entry = buildMcpEntry(
          config.commandType,
          config.envKey,
          vaultPath,
          config.extraFields
        );
        const merged = addMcpEntry(
          existing,
          config.rootKey,
          "obsidian-mcp",
          entry,
          options.force
        );
        if (merged.alreadyExists) {
          result.skipped = "MCP entry already exists";
        } else {
          writeJsonConfig(mcpConfigPath, merged.config);
          result.mcpConfigured = true;
        }
      }
    } else {
      // TOML (Codex)
      if (options.dryRun) {
        result.mcpConfigured = true;
      } else {
        const content = existsSync(mcpConfigPath)
          ? readFileSync(mcpConfigPath, "utf-8")
          : "";
        const block = buildTomlBlock(vaultPath);
        const updated = insertTomlBlock(content, block, options.force);
        if (updated === null) {
          result.skipped = "MCP entry already exists";
        } else {
          const dir = dirname(mcpConfigPath);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          writeFileSync(mcpConfigPath, updated, "utf-8");
          result.mcpConfigured = true;
        }
      }
    }

    // 2. Configure instruction
    if (config.instructionStrategy === "none") {
      // nothing to do
    } else if (options.dryRun) {
      result.instructionConfigured = true;
    } else if (config.instructionStrategy === "markdown-file" && instructionPath) {
      const status = writeMarkdownInstruction(instructionPath, options.force);
      result.instructionConfigured = status !== "exists";
      if (status === "exists") {
        result.skipped = (result.skipped ? result.skipped + "; " : "") + "Instruction already exists";
      }
    } else if (config.instructionStrategy === "mdc-file" && instructionPath) {
      writeMdcInstruction(instructionPath);
      result.instructionConfigured = true;
    } else if (config.instructionStrategy === "config-array" && instructionPath) {
      // OpenCode: add instruction file path to config + write instruction file
      const configPath = detected.mcpConfigPath;
      const existing = readJsonConfig(configPath);
      if (existing === null) {
        result.error = (result.error ? result.error + "; " : "") +
          `Invalid JSON in ${configPath} — skipped instruction config`;
        return result;
      }
      const instructions: string[] = existing.instructions ?? [];
      if (!instructions.includes(instructionPath)) {
        existing.instructions = [...instructions, instructionPath];
        writeJsonConfig(configPath, existing);
      }
      // Write the instruction file itself
      const dir = dirname(instructionPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(instructionPath, INSTRUCTION_TEXT + "\n", "utf-8");
      result.instructionConfigured = true;
    }
  } catch (e: unknown) {
    result.error = (e as Error).message;
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/setup/configure.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/setup/configure.ts src/setup/configure.test.ts
git commit -m "feat(setup): add configure orchestrator for MCP + instructions"
```

---

### Task 8: Teardown orchestrator

**Files:**
- Create: `src/setup/teardown.ts`
- Create: `src/setup/teardown.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/setup/teardown.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync } from "fs";
import { teardownClient } from "./teardown.js";
import { readJsonConfig, writeJsonConfig, removeMcpEntry } from "./json-config.js";
import { removeTomlBlock } from "./toml-config.js";
import { removeMarkdownInstruction, removeMdcInstruction } from "./instructions.js";
import { CLIENT_REGISTRY } from "./clients.js";

vi.mock("./json-config.js");
vi.mock("./toml-config.js");
vi.mock("./instructions.js");
vi.mock("fs");

const mockExists = vi.mocked(existsSync);

describe("teardownClient", () => {
  const claudeConfig = CLIENT_REGISTRY.find((c) => c.slug === "claude-code")!;

  it("removes JSON MCP entry and markdown instruction", () => {
    mockExists.mockReturnValue(true);
    vi.mocked(readJsonConfig).mockReturnValue({
      mcpServers: { "obsidian-mcp": { command: "npx" } },
    });
    vi.mocked(removeMcpEntry).mockReturnValue({
      config: { mcpServers: {} },
      removed: true,
    });
    vi.mocked(removeMarkdownInstruction).mockReturnValue(true);

    const result = teardownClient({
      config: claudeConfig,
      mcpConfigPath: "/home/.claude.json",
      instructionPath: "/home/.claude/CLAUDE.md",
    });

    expect(result.client).toBe("Claude Code");
    expect(result.mcpRemoved).toBe(true);
    expect(result.instructionRemoved).toBe(true);
  });

  it("handles missing config file gracefully", () => {
    mockExists.mockReturnValue(false);
    const result = teardownClient({
      config: claudeConfig,
      mcpConfigPath: "/home/.claude.json",
      instructionPath: "/home/.claude/CLAUDE.md",
    });
    expect(result.mcpRemoved).toBe(false);
  });

  it("reports nothing removed when entry not found", () => {
    mockExists.mockReturnValue(true);
    vi.mocked(readJsonConfig).mockReturnValue({ mcpServers: {} });
    vi.mocked(removeMcpEntry).mockReturnValue({
      config: { mcpServers: {} },
      removed: false,
    });
    vi.mocked(removeMarkdownInstruction).mockReturnValue(false);

    const result = teardownClient({
      config: claudeConfig,
      mcpConfigPath: "/home/.claude.json",
      instructionPath: "/home/.claude/CLAUDE.md",
    });
    expect(result.mcpRemoved).toBe(false);
    expect(result.instructionRemoved).toBe(false);
  });
});
```

- [ ] **Step 2: Write the implementation**

```typescript
// src/setup/teardown.ts
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { dirname } from "path";
import type { DetectedClient, TeardownResult, TeardownOptions } from "./types.js";
import { readJsonConfig, writeJsonConfig, removeMcpEntry } from "./json-config.js";
import { removeTomlBlock } from "./toml-config.js";
import { removeMarkdownInstruction, removeMdcInstruction } from "./instructions.js";
import { CLIENT_REGISTRY } from "./clients.js";
import { detectClient } from "./detect.js";

export function teardownClient(
  detected: DetectedClient,
  options: { dryRun?: boolean } = {}
): TeardownResult {
  const { config, mcpConfigPath, instructionPath } = detected;
  const result: TeardownResult = {
    client: config.name,
    mcpRemoved: false,
    instructionRemoved: false,
  };

  try {
    // 1. Remove MCP entry
    if (config.configFormat === "json") {
      if (options.dryRun) {
        result.mcpRemoved = true;
      } else if (existsSync(mcpConfigPath)) {
        const existing = readJsonConfig(mcpConfigPath);
        if (existing) {
          const { config: updated, removed } = removeMcpEntry(
            existing,
            config.rootKey,
            "obsidian-mcp"
          );
          if (removed) {
            writeJsonConfig(mcpConfigPath, updated);
            result.mcpRemoved = true;
          }
        }
      }
    } else {
      // TOML
      if (options.dryRun) {
        result.mcpRemoved = true;
      } else if (existsSync(mcpConfigPath)) {
        const content = readFileSync(mcpConfigPath, "utf-8");
        const { content: updated, removed } = removeTomlBlock(content);
        if (removed) {
          writeFileSync(mcpConfigPath, updated, "utf-8");
          result.mcpRemoved = true;
        }
      }
    }

    // 2. Remove instruction
    if (config.instructionStrategy === "none") {
      // nothing
    } else if (options.dryRun) {
      result.instructionRemoved = true;
    } else if (config.instructionStrategy === "markdown-file" && instructionPath) {
      result.instructionRemoved = removeMarkdownInstruction(instructionPath);
    } else if (config.instructionStrategy === "mdc-file" && instructionPath) {
      result.instructionRemoved = removeMdcInstruction(instructionPath);
    } else if (config.instructionStrategy === "config-array" && instructionPath) {
      // OpenCode: remove from instructions array + delete instruction file
      if (existsSync(mcpConfigPath)) {
        const existing = readJsonConfig(mcpConfigPath) ?? {};
        const instructions: string[] = existing.instructions ?? [];
        const filtered = instructions.filter((p) => p !== instructionPath);
        if (filtered.length !== instructions.length) {
          existing.instructions = filtered;
          writeJsonConfig(mcpConfigPath, existing);
        }
      }
      if (existsSync(instructionPath)) {
        unlinkSync(instructionPath);
      }
      result.instructionRemoved = true;
    }
  } catch (e: unknown) {
    result.error = (e as Error).message;
  }

  return result;
}

export async function teardownAll(
  options: TeardownOptions = {}
): Promise<TeardownResult[]> {
  const results: TeardownResult[] = [];
  const targets = options.clients
    ? CLIENT_REGISTRY.filter((c) => options.clients!.includes(c.slug))
    : CLIENT_REGISTRY;

  for (const clientConfig of targets) {
    const detected = detectClient(clientConfig);
    if (!detected) continue;
    results.push(teardownClient(detected, { dryRun: options.dryRun }));
  }
  return results;
}
```

- [ ] **Step 3: Expand tests to cover teardown scenarios, run all tests**

Run: `npx vitest run src/setup/teardown.test.ts`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/setup/teardown.ts src/setup/teardown.test.ts
git commit -m "feat(setup): add teardown orchestrator"
```

---

## Chunk 5: CLI Wiring + Postinstall/Preuninstall

### Task 9: CLI subcommand wiring

**Files:**
- Create: `src/setup/index.ts`
- Modify: `src/cli.ts` (add import + registration)

- [ ] **Step 1: Write the setup/teardown CLI index**

```typescript
// src/setup/index.ts
import type { Command } from "commander";
import { CLIENT_REGISTRY } from "./clients.js";
import { detectClient, detectClients } from "./detect.js";
import { configureClient } from "./configure.js";
import { teardownClient, teardownAll } from "./teardown.js";
import type { SetupOptions, TeardownOptions } from "./types.js";

export function registerSetupCommands(program: Command): void {
  program
    .command("setup")
    .description("Auto-configure AI clients to use obsidian-mcp as knowledge base")
    .option("--all", "Configure all supported clients (even undetected)")
    .option("--clients <list>", "Comma-separated client slugs")
    .option("--dry-run", "Show what would change without writing")
    .option("--force", "Overwrite existing obsidian-mcp entries")
    .option("--vault-path <path>", "Override vault path")
    .action(async (opts: { all?: boolean; clients?: string; dryRun?: boolean; force?: boolean; vaultPath?: string }) => {
      const vaultPath = opts.vaultPath ?? process.env.VAULT_PATH ?? "~/Vaults/ai";
      const clientSlugs = opts.clients?.split(",").map((s) => s.trim());

      // Detect
      console.log("\nScanning for AI clients...\n");
      const allClients = CLIENT_REGISTRY;
      const detected = detectClients();
      const detectedSlugs = new Set(detected.map((d) => d.config.slug));

      for (const client of allClients) {
        const found = detectedSlugs.has(client.slug);
        const mark = found ? "+" : "-";
        const suffix = found ? "" : " (not found)";
        console.log(`  ${mark} ${client.name.padEnd(18)}${suffix}`);
      }

      // Determine targets
      let targets: typeof detected;
      if (clientSlugs) {
        targets = detected.filter((d) => clientSlugs.includes(d.config.slug));
        // For --clients, also include undetected if specified
        for (const slug of clientSlugs) {
          if (!detectedSlugs.has(slug)) {
            const cfg = allClients.find((c) => c.slug === slug);
            if (cfg) {
              const d = detectClient(cfg);
              // Create a synthetic detection for --clients flag
              if (!d) {
                const { resolveHome, currentPlatform } = await import("./types.js");
                const plat = currentPlatform();
                targets.push({
                  config: cfg,
                  mcpConfigPath: resolveHome(cfg.mcpConfigPaths[plat]),
                  instructionPath: cfg.instructionPaths
                    ? resolveHome(cfg.instructionPaths[plat])
                    : undefined,
                });
              }
            }
          }
        }
      } else if (opts.all) {
        const { resolveHome, currentPlatform } = await import("./types.js");
        const plat = currentPlatform();
        targets = allClients.map((cfg) => ({
          config: cfg,
          mcpConfigPath: resolveHome(cfg.mcpConfigPaths[plat]),
          instructionPath: cfg.instructionPaths
            ? resolveHome(cfg.instructionPaths[plat])
            : undefined,
        }));
      } else {
        targets = detected;
      }

      if (targets.length === 0) {
        console.log("\nNo clients to configure.");
        console.log('Run "obsidian-mcp-cli setup --all" to configure all supported clients.\n');
        return;
      }

      // Configure
      console.log(`\n${opts.dryRun ? "Would configure" : "Configuring"}...\n`);
      let configured = 0;

      for (const target of targets) {
        const result = configureClient(target, vaultPath, {
          dryRun: opts.dryRun,
          force: opts.force,
        });

        console.log(`  ${result.client}`);
        if (result.error) {
          console.log(`    ! Error: ${result.error}`);
        } else {
          if (result.mcpConfigured) {
            console.log(`    + MCP server ${opts.dryRun ? "would be added to" : "added to"} ${target.mcpConfigPath}`);
          }
          if (result.skipped) {
            console.log(`    ~ ${result.skipped}`);
          }
          if (result.instructionConfigured) {
            const instrLabel = target.config.instructionStrategy === "mdc-file"
              ? "Rule written to"
              : "Instruction added to";
            console.log(`    + ${instrLabel} ${target.instructionPath ?? "config"}`);
          }
          if (target.config.instructionStrategy === "none") {
            console.log("    i No instruction mechanism — AI will discover tools automatically");
          }
          if (!target.config.verified) {
            console.log("    i Config format unverified — please check manually");
          }
          configured++;
        }
      }

      console.log(`\nDone! ${configured} client(s) configured.\n`);

      // Print undetected clients
      const targetSlugs = new Set(targets.map((t) => t.config.slug));
      const unconfigured = allClients.filter((c) => !targetSlugs.has(c.slug));
      if (unconfigured.length > 0 && !opts.all) {
        console.log(`Not configured: ${unconfigured.map((c) => c.name).join(", ")}`);
        console.log('Run "obsidian-mcp-cli setup --all" to configure them.\n');
      }
    });

  program
    .command("teardown")
    .description("Remove obsidian-mcp configuration from AI clients")
    .option("--clients <list>", "Comma-separated client slugs")
    .option("--dry-run", "Show what would be removed")
    .option("--silent", "Suppress output")
    .action(async (opts: { clients?: string; dryRun?: boolean; silent?: boolean }) => {
      const clientSlugs = opts.clients?.split(",").map((s) => s.trim());
      const results = await teardownAll({
        clients: clientSlugs,
        dryRun: opts.dryRun,
        silent: opts.silent,
      });

      if (opts.silent) return;

      if (results.length === 0) {
        console.log("\nNothing to clean up.\n");
        return;
      }

      console.log("\nRemoving obsidian-mcp configuration...\n");
      for (const r of results) {
        console.log(`  ${r.client}`);
        if (r.error) {
          console.log(`    ! Error: ${r.error}`);
        } else {
          if (r.mcpRemoved) console.log("    - MCP entry removed");
          if (r.instructionRemoved) console.log("    - Instruction removed");
          if (!r.mcpRemoved && !r.instructionRemoved) console.log("    ~ Nothing found");
        }
      }
      console.log("\nDone!\n");
    });
}
```

- [ ] **Step 2: Wire into cli.ts**

Add to `src/cli.ts`, after the existing imports (around line 22):

```typescript
import { registerSetupCommands } from "./setup/index.js";
```

Add before `program.parse()` (around line 805):

```typescript
// ── setup / teardown ─────────────────────────────────
registerSetupCommands(program);
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/setup/index.ts src/cli.ts
git commit -m "feat(setup): wire setup/teardown subcommands into CLI"
```

---

### Task 10: Postinstall + preuninstall scripts

**Files:**
- Create: `src/setup/postinstall.ts`
- Create: `src/setup/preuninstall.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Write postinstall script**

```typescript
// src/setup/postinstall.ts
#!/usr/bin/env node
try {
  const { detectClients } = await import("./detect.js");

  if (!process.stdout.isTTY) process.exit(0);

  const detected = detectClients();

  console.log("\n  obsidian-mcp installed!\n");

  if (detected.length > 0) {
    console.log(`  Detected: ${detected.map((c) => c.config.name).join(", ")}`);
    console.log('  Run "obsidian-mcp-cli setup" to auto-configure them as your knowledge base.');
  } else {
    console.log("  No AI clients detected.");
  }

  console.log('  Run "obsidian-mcp-cli setup --all" to configure all 8 supported clients.\n');
} catch {
  process.exit(0);
}
```

- [ ] **Step 2: Write preuninstall script**

```typescript
// src/setup/preuninstall.ts
#!/usr/bin/env node
try {
  const { teardownAll } = await import("./teardown.js");
  await teardownAll({ silent: true });
} catch {
  // never block uninstall
}
process.exit(0);
```

- [ ] **Step 3: Add scripts to package.json**

Add to the `"scripts"` section in `package.json`:

```json
"postinstall": "node dist/setup/postinstall.js || true",
"preuninstall": "node dist/setup/preuninstall.js || true"
```

The `|| true` ensures npm never fails on these scripts even if Node crashes.

- [ ] **Step 4: Build and verify scripts exist**

Run: `npm run build && ls dist/setup/postinstall.js dist/setup/preuninstall.js`
Expected: Both files exist

- [ ] **Step 5: Commit**

```bash
git add src/setup/postinstall.ts src/setup/preuninstall.ts package.json
git commit -m "feat(setup): add postinstall detection + preuninstall cleanup scripts"
```

---

## Chunk 6: Integration Test + Final Verification

### Task 11: Integration test

**Files:**
- Create: `src/setup/setup-integration.test.ts`

- [ ] **Step 1: Write an integration test that exercises setup → verify → teardown → verify**

```typescript
// src/setup/setup-integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// This test uses a real temp directory instead of mocks
import { readJsonConfig, writeJsonConfig, addMcpEntry, removeMcpEntry } from "./json-config.js";
import { writeMarkdownInstruction, removeMarkdownInstruction } from "./instructions.js";
import { insertTomlBlock, removeTomlBlock } from "./toml-config.js";

describe("setup/teardown integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "obsidian-mcp-setup-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("writes and removes JSON MCP entry", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(configPath, '{"existing": true}', "utf-8");

    // Add
    const config = readJsonConfig(configPath);
    const merged = addMcpEntry(config!, "mcpServers", "obsidian-mcp", {
      command: "npx",
      args: ["-y", "@gopherine/obsidian-mcp"],
    });
    writeJsonConfig(configPath, merged.config);

    const after = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(after.existing).toBe(true);
    expect(after.mcpServers["obsidian-mcp"].command).toBe("npx");

    // Backup should exist
    expect(existsSync(`${configPath}.bak.obsidian-mcp`)).toBe(true);

    // Remove
    const { config: cleaned, removed } = removeMcpEntry(after, "mcpServers", "obsidian-mcp");
    writeJsonConfig(configPath, cleaned);
    expect(removed).toBe(true);

    const final = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(final.mcpServers["obsidian-mcp"]).toBeUndefined();
    expect(final.existing).toBe(true);
  });

  it("writes and removes markdown instruction block", () => {
    const mdPath = join(tempDir, "CLAUDE.md");
    writeFileSync(mdPath, "# Existing content\n", "utf-8");

    // Add
    const status = writeMarkdownInstruction(mdPath);
    expect(status).toBe("appended");

    const content = readFileSync(mdPath, "utf-8");
    expect(content).toContain("# Existing content");
    expect(content).toContain("<!-- obsidian-mcp:start -->");
    expect(content).toContain("vault_project_context");

    // Idempotent
    expect(writeMarkdownInstruction(mdPath)).toBe("exists");

    // Remove
    expect(removeMarkdownInstruction(mdPath)).toBe(true);
    const cleaned = readFileSync(mdPath, "utf-8");
    expect(cleaned).toContain("# Existing content");
    expect(cleaned).not.toContain("obsidian-mcp");

    // Remove again — nothing to do
    expect(removeMarkdownInstruction(mdPath)).toBe(false);
  });

  it("writes and removes TOML block", () => {
    const block = `[mcp_servers.obsidian-mcp]\ncommand = "npx"`;

    // Insert
    const result = insertTomlBlock("", block);
    expect(result).toContain("# obsidian-mcp:start");

    // Idempotent
    expect(insertTomlBlock(result!, block)).toBeNull();

    // Remove
    const { content, removed } = removeTomlBlock(result!);
    expect(removed).toBe(true);
    expect(content).not.toContain("obsidian-mcp");
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx vitest run src/setup/setup-integration.test.ts`
Expected: All PASS

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 5: Manual smoke test**

Run: `node dist/cli.js setup --dry-run`
Expected: Scans for clients, shows detection results, says "Would configure"

Run: `node dist/cli.js teardown --dry-run`
Expected: Shows what would be removed (or "Nothing to clean up")

- [ ] **Step 6: Commit**

```bash
git add src/setup/setup-integration.test.ts
git commit -m "test(setup): add integration tests for setup/teardown lifecycle"
```

---

### Task 12: Final commit + summary

- [ ] **Step 1: Run lint check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: All tests pass, setup modules have >80% coverage

- [ ] **Step 3: Verify the CLI help shows new commands**

Run: `node dist/cli.js --help`
Expected: `setup` and `teardown` commands appear in help output

import { describe, it, expect } from "vitest";
import { mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRegistry } from "./registry.js";
import { isMainEntry } from "../cli.js";

const WORKTREE_TOOLS = [
  "worktree_env",
  "worktree_audit",
  "worktree_status",
  "worktree_activate",
  "worktree_apply",
  "worktree_gc",
  "worktree_uninstall",
] as const;

const GC_FILTERS = [
  "tool",
  "older_than",
  "newer_than",
  "min_size",
  "max_size",
  "tier",
  "include",
  "exclude",
  "keep_latest",
  "project",
  "all",
  "undo",
  "purge",
  "confirm",
] as const;

describe("worktree MCP registrations", () => {
  it("registers all seven worktree tools", () => {
    const registry = createRegistry();
    const names = registry.getToolNames();
    for (const name of WORKTREE_TOOLS) {
      expect(names, `Missing tool: ${name}`).toContain(name);
    }
  });

  it("gives every worktree tool an agent-usable description", () => {
    const registry = createRegistry();
    for (const name of WORKTREE_TOOLS) {
      const description = registry.get(name)!.toolDef.description;
      expect(description.length, `${name} description too short`).toBeGreaterThan(40);
    }
  });

  it("exposes an object inputSchema for every worktree tool", () => {
    const registry = createRegistry();
    for (const name of WORKTREE_TOOLS) {
      const schema = registry.get(name)!.toolDef.inputSchema;
      expect(schema.type, `${name} schema type`).toBe("object");
      expect(schema.properties, `${name} schema properties`).toBeDefined();
    }
  });

  it("sets read-only and destructive annotations as specified", () => {
    const registry = createRegistry();
    expect(registry.get("worktree_env")!.toolDef.annotations).toEqual({ readOnlyHint: true });
    expect(registry.get("worktree_audit")!.toolDef.annotations).toEqual({ readOnlyHint: true });
    expect(registry.get("worktree_status")!.toolDef.annotations).toEqual({ readOnlyHint: true });
    expect(registry.get("worktree_activate")!.toolDef.annotations).toEqual({
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(registry.get("worktree_apply")!.toolDef.annotations).toEqual({ destructiveHint: true });
    expect(registry.get("worktree_gc")!.toolDef.annotations).toEqual({
      destructiveHint: true,
      idempotentHint: false,
    });
    expect(registry.get("worktree_uninstall")!.toolDef.annotations).toEqual({ destructiveHint: true });
  });

  it("exposes gc filter properties in the input schema", () => {
    const registry = createRegistry();
    const schema = registry.get("worktree_gc")!.toolDef.inputSchema as {
      properties?: Record<string, unknown>;
    };
    for (const filter of GC_FILTERS) {
      expect(schema.properties ?? {}, `Missing gc property: ${filter}`).toHaveProperty(filter);
    }
  });

  it("adapts read-only worktree tool args", () => {
    const registry = createRegistry();
    expect(
      registry.get("worktree_env")!.adaptArgs!({ json: true, shell: "fish", providers: ["pnpm"] }),
    ).toEqual({ json: true, shell: "fish", providers: ["pnpm"] });
    expect(registry.get("worktree_env")!.adaptArgs!({})).toEqual({
      json: false,
      shell: undefined,
      providers: undefined,
    });
    expect(registry.get("worktree_audit")!.adaptArgs!({ sizes: true, worktree: "/wt" })).toEqual({
      json: false,
      sizes: true,
      worktree: "/wt",
    });
    expect(registry.get("worktree_status")!.adaptArgs!({ budget: "2G" })).toEqual({
      json: false,
      budget: "2G",
    });
  });

  it("maps activate confirm to yes, defaults hooks/seed on, and allows opt-out", () => {
    const registry = createRegistry();
    expect(registry.get("worktree_activate")!.adaptArgs!({ confirm: false })).toEqual({
      yes: false,
      hooks: true,
      hosts: undefined,
      seed: true,
      install: false,
      dryRun: true,
      json: false,
    });
    expect(
      registry.get("worktree_activate")!.adaptArgs!({
        confirm: true,
        hooks: false,
        hosts: ["codex"],
        seed: false,
        install: true,
        dry_run: true,
      }),
    ).toEqual({
      yes: true,
      hooks: false,
      hosts: ["codex"],
      seed: false,
      install: true,
      dryRun: true,
      json: false,
    });
  });

  it("maps apply and uninstall args with confirm to yes", () => {
    const registry = createRegistry();
    expect(
      registry.get("worktree_apply")!.adaptArgs!({ item: ["seed:pnpm"], all_safe: true, confirm: true }),
    ).toEqual({ item: ["seed:pnpm"], allSafe: true, yes: true, json: false });
    expect(registry.get("worktree_apply")!.adaptArgs!({})).toEqual({
      item: undefined,
      allSafe: false,
      yes: false,
      json: false,
    });
    expect(registry.get("worktree_uninstall")!.adaptArgs!({ purge_local: true, confirm: true })).toEqual({
      purgeLocal: true,
      yes: true,
      json: false,
    });
  });

  it("maps gc snake_case filters and confirm to apply/yes", () => {
    const registry = createRegistry();
    const adapted = registry.get("worktree_gc")!.adaptArgs!({
      tool: ["pnpm"],
      older_than: "30d",
      newer_than: "12h",
      min_size: "1M",
      max_size: "2G",
      tier: "consent",
      include: ["a/**"],
      exclude: ["b/**"],
      keep_latest: 3,
      project: "demo",
      all: true,
      undo: "journal-1",
      purge: true,
      confirm: true,
      worktree: "/wt",
      json: true,
    });
    expect(adapted).toEqual({
      tool: ["pnpm"],
      olderThan: "30d",
      newerThan: "12h",
      minSize: "1M",
      maxSize: "2G",
      tier: "consent",
      include: ["a/**"],
      exclude: ["b/**"],
      keepLatest: 3,
      project: "demo",
      all: true,
      undo: "journal-1",
      purge: true,
      worktree: "/wt",
      apply: true,
      yes: true,
      json: true,
    });

    const defaults = registry.get("worktree_gc")!.adaptArgs!({});
    expect(defaults).toEqual({
      tool: undefined,
      olderThan: undefined,
      newerThan: undefined,
      minSize: undefined,
      maxSize: undefined,
      tier: undefined,
      include: undefined,
      exclude: undefined,
      keepLatest: undefined,
      project: undefined,
      all: false,
      undo: undefined,
      purge: false,
      worktree: undefined,
      apply: false,
      yes: false,
      json: false,
    });
  });

  it("normalizes invalid worktree_gc tier values to undefined", () => {
    const registry = createRegistry();
    const adapt = registry.get("worktree_gc")!.adaptArgs!;
    for (const invalid of ["garbage", "Auto", "both ", "", 42, null]) {
      const adapted = adapt({ tier: invalid }) as { tier: unknown };
      expect(adapted.tier, `tier=${JSON.stringify(invalid)}`).toBeUndefined();
    }
    for (const valid of ["auto", "consent", "both"] as const) {
      const adapted = adapt({ tier: valid }) as { tier: unknown };
      expect(adapted.tier, `tier=${valid}`).toBe(valid);
    }
  });
});

describe("isMainEntry", () => {
  it.skipIf(process.platform === "win32")(
    "treats a symlinked argv[1] as the main entry",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "superskill-main-entry-"));
      try {
        const realPath = join(dir, "cli.js");
        const linkPath = join(dir, "superskill-cli");
        await writeFile(realPath, "");
        await symlink(realPath, linkPath);

        const moduleUrl = pathToFileURL(await realpath(realPath)).href;
        expect(isMainEntry(linkPath, moduleUrl)).toBe(true);
        expect(isMainEntry(linkPath, pathToFileURL(join(dir, "other.js")).href)).toBe(false);

        const missing = join(dir, "does-not-exist.js");
        expect(isMainEntry(missing, pathToFileURL(missing).href)).toBe(true);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );

  it("returns false when argv[1] is undefined", () => {
    expect(isMainEntry(undefined, pathToFileURL("/tmp/whatever.js").href)).toBe(false);
  });
});

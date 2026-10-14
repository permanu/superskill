import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../../core/types.js";
import type { ActivationResult } from "../../lib/worktree/activate.js";
import type { WorktreePolicy } from "../../lib/worktree/state.js";
import type { WorktreeActivateArgs } from "./activate.js";
import type { WorktreeBootstrapArgs } from "./bootstrap.js";
import type { WorktreeUninstallArgs, WorktreeUninstallResult } from "./uninstall.js";

const boundary = vi.hoisted(() => ({
  buildProviderContext: vi.fn(),
  resolveProviders: vi.fn(),
  readPolicy: vi.fn(),
  writePolicy: vi.fn(),
  appendJournal: vi.fn(),
  newJournalId: vi.fn(),
  repoStateDir: vi.fn(),
  cacheNamespace: vi.fn(),
  worktreeKey: vi.fn(),
  listWorktrees: vi.fn(),
  migrateLegacyNamespace: vi.fn(),
  recordWorktreeMarker: vi.fn(),
  namespaceUpkeep: vi.fn(),
  seedWorktree: vi.fn(),
  quarantinePaths: vi.fn(),
  detectAdapters: vi.fn(),
  planAdapters: vi.fn(),
  installAdapters: vi.fn(),
  uninstallAdapters: vi.fn(),
  installPostCheckoutHook: vi.fn(),
  uninstallPostCheckoutHook: vi.fn(),
  resolveWorktreeEnv: vi.fn(),
  existsSync: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  realpath: vi.fn(),
  rm: vi.fn(),
}));

const fixture = vi.hoisted(() => ({
  adapters: {} as Record<string, unknown>,
  hooks: {} as Record<string, unknown>,
  env: {} as Record<string, unknown>,
  adapterImportError: null as Error | null,
  hookImportError: null as Error | null,
  files: new Map<string, string>(),
}));

vi.mock("node:fs", () => ({ existsSync: boundary.existsSync }));
vi.mock("node:fs/promises", () => ({
  readFile: boundary.readFile,
  writeFile: boundary.writeFile,
  realpath: boundary.realpath,
  rm: boundary.rm,
}));
vi.mock("../../lib/toolchains/index.js", () => ({ resolveProviders: boundary.resolveProviders }));
vi.mock("../../lib/worktree/context.js", () => ({ buildProviderContext: boundary.buildProviderContext }));
vi.mock("../../lib/worktree/state.js", () => ({
  POLICY_SCHEMA_VERSION: 1,
  readPolicy: boundary.readPolicy,
  writePolicy: boundary.writePolicy,
  appendJournal: boundary.appendJournal,
  newJournalId: boundary.newJournalId,
}));
vi.mock("../../lib/worktree/paths.js", () => ({
  repoStateDir: boundary.repoStateDir,
  cacheNamespace: boundary.cacheNamespace,
  worktreeKey: boundary.worktreeKey,
}));
vi.mock("../../lib/worktree/safety.js", () => ({ listWorktrees: boundary.listWorktrees }));
vi.mock("../../lib/worktree/namespace.js", () => ({
  migrateLegacyNamespace: boundary.migrateLegacyNamespace,
  recordWorktreeMarker: boundary.recordWorktreeMarker,
  namespaceUpkeep: boundary.namespaceUpkeep,
}));
vi.mock("../../lib/worktree/seed.js", () => ({ seedWorktree: boundary.seedWorktree }));
vi.mock("../../lib/worktree/quarantine.js", () => ({ quarantinePaths: boundary.quarantinePaths }));

const BASE = "/private/var/folders/jy/hhmjp4yx34x0g_nptcvchp180000gn/T/opencode/control-coverage-virtual";
const MAIN = `${BASE}/main`;
const WORKTREE = `${BASE}/feature`;
const STATE = `${BASE}/git/superskill`;
const CACHE = `${BASE}/cache/control-repo`;
const ENV_FILE = `${BASE}/claude.env`;
const BEGIN = "# >>> superskill worktree-env";
const END = "# <<< superskill worktree-env <<<";

function context(workspacePath: string | undefined = WORKTREE): CommandContext {
  return {
    vaultFs: {} as CommandContext["vaultFs"],
    vaultPath: `${BASE}/vault`,
    sessionRegistry: {} as CommandContext["sessionRegistry"],
    config: { vaultPath: `${BASE}/vault`, maxInjectTokens: 1500, sessionTtlHours: 2 },
    log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    workspacePath,
  };
}

function policy(overrides: Partial<WorktreePolicy> = {}): WorktreePolicy {
  return {
    v: 1,
    repoId: "control-repo",
    remoteHash: null,
    repoRoot: MAIN,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    stacks: [],
    tools: [],
    flags: {},
    hosts: [],
    activation: { hooks: true, seed: true, install: false },
    ...overrides,
  };
}

function adapter(adapterId = "claude", changed = false) {
  return { adapter: adapterId, changed, dryRun: false, files: [] as string[], notes: [] as string[] };
}

async function activate(args: WorktreeActivateArgs = {}, ctx = context()) {
  const { worktreeActivateCommand } = await import("./activate.js");
  return worktreeActivateCommand(args, ctx);
}

async function uninstall(args: WorktreeUninstallArgs = {}, ctx = context()) {
  const { worktreeUninstallCommand } = await import("./uninstall.js");
  return await worktreeUninstallCommand(args, ctx) as WorktreeUninstallResult;
}

async function bootstrap(args: WorktreeBootstrapArgs = {}) {
  const { worktreeBootstrapCommand } = await import("./bootstrap.js");
  return worktreeBootstrapCommand(args, context());
}

async function sessionEnv(raw: unknown) {
  vi.stubEnv("CLAUDE_ENV_FILE", ENV_FILE);
  boundary.resolveWorktreeEnv.mockResolvedValue(raw);
  return bootstrap({ source: "session", claudeEnv: true });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  vi.stubEnv("SUPERSKILL_WORKTREE_BOOTSTRAP", undefined);
  vi.stubEnv("CLAUDE_ENV_FILE", undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  fixture.files.clear();
  fixture.adapterImportError = null;
  fixture.hookImportError = null;
  fixture.adapters = {
    ALL_ADAPTERS: undefined,
    allAdapters: undefined,
    adapters: undefined,
    ADAPTERS: undefined,
    getAdapters: undefined,
    default: undefined,
    detectAdapters: boundary.detectAdapters,
    planAdapters: boundary.planAdapters,
    installAdapters: boundary.installAdapters,
    uninstallAdapters: boundary.uninstallAdapters,
  };
  fixture.hooks = {
    installPostCheckoutHook: boundary.installPostCheckoutHook,
    uninstallPostCheckoutHook: boundary.uninstallPostCheckoutHook,
  };
  fixture.env = { resolveWorktreeEnv: boundary.resolveWorktreeEnv };
  vi.doMock("../../lib/worktree/host-adapters/index.js", () => {
    if (fixture.adapterImportError) throw fixture.adapterImportError;
    return fixture.adapters;
  });
  vi.doMock("../../lib/worktree/hooks.js", () => {
    if (fixture.hookImportError) throw fixture.hookImportError;
    return fixture.hooks;
  });
  vi.doMock("../../lib/worktree/env.js", () => fixture.env);
  boundary.buildProviderContext.mockResolvedValue({
    repoId: "control-repo",
    repoRoot: MAIN,
    remoteHash: null,
    legacyRepoId: "legacy-control",
    stacks: [],
    ctx: { worktreeRoot: WORKTREE },
  });
  boundary.resolveProviders.mockResolvedValue([]);
  boundary.readPolicy.mockResolvedValue(policy());
  boundary.writePolicy.mockResolvedValue(undefined);
  boundary.appendJournal.mockResolvedValue(undefined);
  boundary.newJournalId.mockReturnValue("uninstall-journal");
  boundary.repoStateDir.mockResolvedValue(STATE);
  boundary.cacheNamespace.mockReturnValue(CACHE);
  boundary.worktreeKey.mockImplementation((path: string) => `key:${path}`);
  boundary.listWorktrees.mockResolvedValue([{ path: MAIN }, { path: WORKTREE }]);
  boundary.migrateLegacyNamespace.mockResolvedValue({ note: null });
  boundary.recordWorktreeMarker.mockResolvedValue(undefined);
  boundary.namespaceUpkeep.mockResolvedValue({ notes: ["namespace checked"] });
  boundary.seedWorktree.mockResolvedValue({ seeded: [], skipped: [], notes: [] });
  boundary.detectAdapters.mockResolvedValue([]);
  boundary.planAdapters.mockResolvedValue([]);
  boundary.installAdapters.mockResolvedValue([]);
  boundary.uninstallAdapters.mockResolvedValue([]);
  boundary.installPostCheckoutHook.mockResolvedValue({
    changed: false,
    kind: "block",
    hookFile: `${STATE}/post-checkout`,
    backupPath: null,
    fingerprint: "hook-fingerprint",
    notes: [],
  });
  boundary.uninstallPostCheckoutHook.mockResolvedValue({ removed: false, restored: false, notes: [] });
  boundary.resolveWorktreeEnv.mockResolvedValue([]);
  boundary.existsSync.mockReturnValue(false);
  boundary.realpath.mockImplementation(async (path: string) => path);
  boundary.readFile.mockImplementation(async (path: string) => {
    if (!fixture.files.has(path)) throw Object.assign(new Error("missing env file"), { code: "ENOENT" });
    return fixture.files.get(path);
  });
  boundary.writeFile.mockImplementation(async (path: string, content: string) => {
    fixture.files.set(path, content);
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.doUnmock("../../lib/worktree/host-adapters/index.js");
  vi.doUnmock("../../lib/worktree/hooks.js");
  vi.doUnmock("../../lib/worktree/env.js");
});

describe("activation consent and command dispatch", () => {
  it("defaults to a preview without policy, adapter, or marker mutations", async () => {
    const ctx = context();
    ctx.workspacePath = undefined;
    boundary.detectAdapters.mockResolvedValue([{ id: "claude" }]);
    boundary.planAdapters.mockResolvedValue([adapter("claude", true)]);

    const result = await activate({}, ctx);

    expect(boundary.buildProviderContext).toHaveBeenCalledWith(process.cwd());
    expect(ctx.log.debug).toHaveBeenCalledWith("[worktree-activate] activating repo from", process.cwd());
    expect(result).toMatchObject({ dryRun: true, adapters: [adapter("claude", true)] });
    expect(result.notes).toContain("consent required: pass --yes (CLI) or confirm=true (MCP)");
    expect(boundary.installPostCheckoutHook).toHaveBeenCalledWith(process.cwd(), { dryRun: true, cliPath: null });
    expect(boundary.migrateLegacyNamespace).toHaveBeenCalledWith(
      { repoId: "control-repo", legacyRepoId: "legacy-control" }, { dryRun: true },
    );
    expect(boundary.writePolicy).not.toHaveBeenCalled();
    expect(boundary.installAdapters).not.toHaveBeenCalled();
    expect(boundary.recordWorktreeMarker).not.toHaveBeenCalled();
  });

  it.each([false, true])("explicit dry-run remains non-mutating with yes=%s", async (yes) => {
    const result = await activate({ yes, dryRun: true, hooks: false, hosts: [] });

    expect(result).toMatchObject({ dryRun: true, hook: null, adapters: [] });
    expect(result.notes).toContain("dry-run: no policy, hook, or adapter changes written");
    expect(boundary.writePolicy).not.toHaveBeenCalled();
    expect(boundary.installPostCheckoutHook).not.toHaveBeenCalled();
    expect(boundary.planAdapters).not.toHaveBeenCalled();
    expect(boundary.installAdapters).not.toHaveBeenCalled();
  });

  it("forwards approved host, hook, seed and install choices to the selected workspace", async () => {
    const env = vi.fn().mockResolvedValue([{ name: "CACHE_FLAG", value: "isolated" }]);
    boundary.resolveProviders.mockResolvedValue([{ id: "node", env }]);
    boundary.installAdapters.mockResolvedValue([adapter("claude", true)]);

    const result = await activate({
      yes: true, hooks: false, hosts: ["claude", "opencode"], seed: false, install: true, json: true,
    });

    expect(boundary.buildProviderContext).toHaveBeenCalledWith(WORKTREE);
    expect(boundary.writePolicy).toHaveBeenCalledWith(WORKTREE, expect.objectContaining({
      hosts: ["claude", "opencode"], tools: ["node"], flags: { CACHE_FLAG: "isolated" },
      activation: { hooks: false, seed: false, install: true },
    }));
    expect(boundary.installAdapters).toHaveBeenCalledWith({
      repoRoot: MAIN, worktreeRoot: WORKTREE, stateDir: STATE,
      envCommand: "superskill-cli worktree env --eval", superskillCli: null,
    }, ["claude", "opencode"]);
    expect(boundary.detectAdapters).not.toHaveBeenCalled();
    expect(boundary.installPostCheckoutHook).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dryRun: false, changed: true, providers: ["node"], hook: null });
    expect(result.notes).toContain("hooks disabled: post-checkout hook not installed");
    expect(result.notes).toContain("host adapters targeted: claude, opencode");
  });

  it("records each known worktree and reports migration, hook and absent-host outcomes", async () => {
    boundary.migrateLegacyNamespace.mockResolvedValue({ note: "legacy cache retained" });
    boundary.installPostCheckoutHook.mockResolvedValue({
      changed: true, kind: "block", hookFile: "hook", backupPath: null, fingerprint: "new", notes: ["guard installed"],
    });

    const result = await activate({ yes: true });

    expect(boundary.writePolicy).toHaveBeenCalledWith(WORKTREE, expect.objectContaining({
      createdAt: policy().createdAt, activation: { hooks: true, seed: true, install: false },
    }));
    expect(boundary.recordWorktreeMarker.mock.calls).toEqual([
      [CACHE, `key:${MAIN}`, MAIN], [CACHE, `key:${WORKTREE}`, WORKTREE],
    ]);
    expect(result.changed).toBe(true);
    expect(result.notes).toEqual(expect.arrayContaining([
      "legacy cache retained", "hook: guard installed", "no host adapters selected or detected: skipped",
    ]));
  });

  it.each([true, false])("reports adapter-only changes accurately in dryRun=%s", async (dryRun) => {
    boundary.readPolicy.mockResolvedValue(policy({
      hosts: ["claude"], activation: { hooks: false, seed: true, install: false },
    }));
    const results = [adapter("unchanged"), adapter("claude", true)];
    boundary.planAdapters.mockResolvedValue(results);
    boundary.installAdapters.mockResolvedValue(results);

    const result = await activate({ yes: true, dryRun, hooks: false, hosts: ["claude"] });

    expect(result).toMatchObject({ changed: true, dryRun, adapters: results });
    expect(dryRun ? boundary.planAdapters : boundary.installAdapters).toHaveBeenCalled();
  });

  it("reports an unchanged policy and integrations without inventing a change", async () => {
    const result = await activate({ yes: true, hosts: [] });
    expect(result).toMatchObject({ changed: false, dryRun: false });
  });

  it("keeps activation usable when marker registration fails and reports the failure", async () => {
    boundary.listWorktrees.mockRejectedValue(new Error("worktree listing denied"));
    const result = await activate({ yes: true, hosts: [] });
    expect(result.dryRun).toBe(false);
    expect(result.notes).toContain("worktree marker registration failed: worktree listing denied");
    expect(console.error).toHaveBeenCalledWith("[worktree-activate] marker registration failed: worktree listing denied");
    expect(boundary.installPostCheckoutHook).toHaveBeenCalled();
  });

  it.each(["buildProviderContext", "readPolicy", "writePolicy"] as const)(
    "propagates %s failure without installing integrations", async (name) => {
      const error = new Error(`${name} unavailable`);
      boundary[name].mockRejectedValue(error);
      await expect(activate({ yes: true, hosts: ["claude"] })).rejects.toBe(error);
      expect(boundary.installPostCheckoutHook).not.toHaveBeenCalled();
      expect(boundary.installAdapters).not.toHaveBeenCalled();
    },
  );
});

describe("activation output", () => {
  function result(overrides: Partial<ActivationResult> = {}): ActivationResult {
    return {
      changed: false, dryRun: false, repoRoot: MAIN, repoId: "control-repo", policyPath: `${STATE}/policy.json`,
      stacks: [], providers: [], hook: null, adapters: [], notes: [], ...overrides,
    };
  }

  it.each([true, false])("distinguishes planned and absent hooks in dryRun=%s", async (dryRun) => {
    const { renderWorktreeActivate } = await import("./activate.js");
    const text = renderWorktreeActivate(result({ dryRun }));
    expect(text).toContain(dryRun ? "worktree activate (dry-run)" : "worktree activate\n");
    expect(text).toContain(`policy:     ${STATE}/policy.json${dryRun ? " (planned)" : ""}`);
    expect(text).toContain(`hook:       ${dryRun ? "not planned" : "not installed"}`);
    expect(text).toContain("stacks:     none detected");
    expect(text).toContain("providers:  none");
    expect(text).toContain("adapters:   none");
  });

  it("renders installed hooks, backups, adapter files and explanatory notes", async () => {
    const { renderWorktreeActivate } = await import("./activate.js");
    const text = renderWorktreeActivate(result({
      stacks: ["typescript", "go"], providers: ["node", "go"],
      hook: { changed: true, kind: "husky", hookFile: ".husky/post-checkout", backupPath: "hook.bak", fingerprint: "x", notes: [] },
      adapters: [{ ...adapter("claude", true), files: ["settings.json", "hooks.json"] }, adapter("codex")],
      notes: ["policy preserved"],
    }));
    expect(text).toContain("stacks:     typescript, go");
    expect(text).toContain("providers:  node, go");
    expect(text).toContain("hook:       husky (installed) -> .husky/post-checkout");
    expect(text).toContain("backup:     hook.bak");
    expect(text).toContain("adapter:    claude (changed) [settings.json, hooks.json]");
    expect(text).toContain("adapter:    codex (unchanged)\n");
    expect(text).toContain("note:       policy preserved");
  });

  it("reports an unchanged hook without suggesting a backup exists", async () => {
    const { renderWorktreeActivate } = await import("./activate.js");
    const text = renderWorktreeActivate(result({
      hook: { changed: false, kind: "block", hookFile: "hook", backupPath: null, fingerprint: "x", notes: [] },
    }));
    expect(text).toContain("hook:       block (unchanged) -> hook");
    expect(text).not.toContain("backup:");
  });
});

describe("uninstall consent, compatibility and failures", () => {
  it("keeps policy and cache by default and journals the unchanged repository", async () => {
    const ctx = context();
    ctx.workspacePath = undefined;
    const result = await uninstall({}, ctx);
    expect(boundary.buildProviderContext).toHaveBeenCalledWith(process.cwd());
    expect(result.policy).toEqual({ path: `${STATE}/policy.json`, kept: true });
    expect(result.notes).toContain(`policy kept at ${STATE}/policy.json (deletion outside the quarantine root is forbidden)`);
    expect(boundary.quarantinePaths).not.toHaveBeenCalled();
    expect(boundary.existsSync).not.toHaveBeenCalled();
    expect(boundary.rm).not.toHaveBeenCalled();
    expect(boundary.writePolicy).not.toHaveBeenCalled();
    expect(boundary.appendJournal).toHaveBeenCalledWith(MAIN, expect.objectContaining({
      action: "uninstall", paths: [MAIN], bytes: 0, detail: "adapters=none hook=unchanged policy=kept",
    }));
  });

  it.each([undefined, false])("never probes or quarantines caches without yes=%s", async (yes) => {
    const result = await uninstall({ purgeLocal: true, yes });
    expect(result.cacheSkipped).toEqual({
      path: CACHE, reason: "requires --yes; caches are only quarantined (reversible), never deleted",
    });
    expect(boundary.existsSync).not.toHaveBeenCalled();
    expect(boundary.quarantinePaths).not.toHaveBeenCalled();
    expect(boundary.rm).not.toHaveBeenCalled();
  });

  it("does not create a quarantine when an approved namespace is absent", async () => {
    const result = await uninstall({ purgeLocal: true, yes: true });
    expect(result.cacheSkipped).toEqual({ path: CACHE, reason: "cache namespace not present" });
    expect(boundary.existsSync).toHaveBeenCalledWith(CACHE);
    expect(boundary.quarantinePaths).not.toHaveBeenCalled();
  });

  it("quarantines only the approved repository namespace and journals all moved bytes", async () => {
    boundary.existsSync.mockReturnValue(true);
    const purgedCache = {
      journalId: "quarantine-1", quarantineDir: `${BASE}/quarantine`,
      moved: [{ from: CACHE, to: `${BASE}/quarantine/cache`, bytes: 1024 },
        { from: `${CACHE}/extra`, to: `${BASE}/quarantine/extra`, bytes: 512 }],
    };
    boundary.quarantinePaths.mockResolvedValue(purgedCache);
    boundary.uninstallAdapters.mockResolvedValue([
      { ...adapter("claude", true), files: ["settings.json"], notes: ["settings preserved"] },
      { ...adapter("codex"), files: "invalid", notes: null },
    ]);
    boundary.uninstallPostCheckoutHook.mockResolvedValue({ removed: true, restored: true, notes: ["previous hook restored"] });

    const result = await uninstall({ purgeLocal: true, yes: true, json: true });

    expect(boundary.quarantinePaths).toHaveBeenCalledWith(MAIN, [CACHE]);
    expect(result).toMatchObject({
      purgedCache, cacheSkipped: undefined,
      adapters: { available: true, uninstalled: ["claude"], files: ["settings.json"], notes: ["settings preserved"] },
      hook: { available: true, removed: true, restored: true, notes: ["previous hook restored"] },
    });
    expect(boundary.uninstallAdapters).toHaveBeenCalledWith({
      repoRoot: MAIN, worktreeRoot: WORKTREE, stateDir: STATE,
      envCommand: "superskill-cli worktree env --eval", superskillCli: null,
    });
    expect(boundary.appendJournal).toHaveBeenCalledWith(MAIN, expect.objectContaining({
      paths: ["settings.json", CACHE, `${CACHE}/extra`], bytes: 1536,
      detail: "adapters=claude hook=removed policy=kept",
    }));
    expect(result.notes).toContain("cache quarantined (reversible): 2 dir(s); undo with worktree gc --undo quarantine-1");
    expect(boundary.rm).not.toHaveBeenCalled();
  });

  it("does not claim success or journal a quarantine that failed", async () => {
    boundary.existsSync.mockReturnValue(true);
    const error = new Error("quarantine identity changed");
    boundary.quarantinePaths.mockRejectedValue(error);
    await expect(uninstall({ purgeLocal: true, yes: true })).rejects.toBe(error);
    expect(boundary.appendJournal).not.toHaveBeenCalled();
  });

  it("tolerates a registry returning no action results", async () => {
    boundary.uninstallAdapters.mockResolvedValue(undefined);
    boundary.readPolicy.mockResolvedValue(null);
    const result = await uninstall();
    expect(result.adapters).toEqual({ available: true, uninstalled: [], files: [], notes: [] });
    expect(result.policy).toEqual({ path: null, kept: false });
    expect(result.notes).toEqual([]);
  });

  it("continues hook removal after a registry uninstall error", async () => {
    boundary.uninstallAdapters.mockRejectedValue(new Error("registry locked"));
    const result = await uninstall();
    expect(result.adapters.notes).toEqual(["adapter registry uninstall failed: registry locked"]);
    expect(boundary.uninstallPostCheckoutHook).toHaveBeenCalledWith(MAIN);
    expect(boundary.appendJournal).toHaveBeenCalled();
  });

  it.each(["ALL_ADAPTERS", "allAdapters", "adapters", "ADAPTERS"])(
    "accepts the legacy %s registry shape", async (key) => {
      fixture.adapters.uninstallAdapters = undefined;
      const remove = vi.fn().mockResolvedValue({ files: ["legacy.json"], notes: ["legacy removed"] });
      fixture.adapters[key] = [{ id: "legacy-host", uninstall: remove }];
      const result = await uninstall();
      expect(result.adapters).toMatchObject({
        uninstalled: ["legacy-host"], files: ["legacy.json"], notes: ["legacy removed"],
      });
      expect(remove).toHaveBeenCalledWith(expect.objectContaining({ worktreeRoot: WORKTREE }));
    },
  );

  it("skips adapters without uninstall and isolates failing or incomplete legacy results", async () => {
    fixture.adapters.uninstallAdapters = undefined;
    fixture.adapters.ALL_ADAPTERS = [
      { id: "no-uninstall" },
      { uninstall: vi.fn().mockResolvedValue(undefined) },
      { id: "broken", uninstall: vi.fn().mockRejectedValue(new Error("permission denied")) },
      { id: "odd", uninstall: vi.fn().mockResolvedValue({ files: null, notes: "invalid" }) },
    ];
    const result = await uninstall();
    expect(result.adapters).toEqual({
      available: true, uninstalled: ["unknown-adapter", "odd"], files: [],
      notes: ["broken: uninstall failed: permission denied"],
    });
  });

  it.each([
    { name: "getter array", getter: "array", fallback: undefined, found: true },
    { name: "getter nested array", getter: "nested", fallback: undefined, found: true },
    { name: "default array after null getter", getter: null, fallback: "array", found: true },
    { name: "default nested array after invalid getter", getter: {}, fallback: "nested", found: true },
    { name: "invalid nested getter and default", getter: { adapters: false }, fallback: {}, found: false },
    { name: "primitive getter and default", getter: 7, fallback: false, found: false },
  ])("handles $name without touching unrelated hosts", async ({ getter, fallback, found }) => {
    fixture.adapters.uninstallAdapters = undefined;
    const host = { id: "compat", uninstall: vi.fn().mockResolvedValue({}) };
    fixture.adapters.getAdapters = vi.fn().mockResolvedValue(
      getter === "array" ? [host] : getter === "nested" ? { adapters: [host] } : getter,
    );
    fixture.adapters.default = fallback === "array" ? [host] : fallback === "nested" ? { adapters: [host] } : fallback;
    const result = await uninstall();
    expect(result.adapters.uninstalled).toEqual(found ? ["compat"] : []);
    expect(result.adapters.notes).toEqual(found ? [] : ["no host adapters registered"]);
  });

  it("falls back after getAdapters throws and reports that error", async () => {
    fixture.adapters.uninstallAdapters = undefined;
    fixture.adapters.getAdapters = vi.fn().mockRejectedValue(new Error("discovery failed"));
    fixture.adapters.default = { adapters: [{ id: "fallback", uninstall: vi.fn().mockResolvedValue({}) }] };
    const result = await uninstall();
    expect(result.adapters.uninstalled).toEqual(["fallback"]);
    expect(console.error).toHaveBeenCalledWith("[worktree-uninstall] getAdapters failed: discovery failed");
  });

  it("reports unavailable adapter and hook modules without losing policy preservation", async () => {
    fixture.adapterImportError = new Error("adapter module cannot load");
    fixture.hookImportError = new Error("hook module cannot load");
    const result = await uninstall();
    expect(result.adapters).toMatchObject({ available: false, notes: ["host adapter registry not available; skipped"] });
    expect(result.hook).toMatchObject({ available: false, notes: ["post-checkout hook module not available; skipped"] });
    expect(result.policy.kept).toBe(true);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("[worktree-uninstall] import"));
  });

  it("reports a hook module without an uninstall export", async () => {
    fixture.hooks.uninstallPostCheckoutHook = undefined;
    const result = await uninstall();
    expect(result.hook).toEqual({
      available: false, removed: false, restored: false, notes: ["post-checkout hook module not available; skipped"],
    });
  });

  it("does not mistake truthy malformed hook flags for successful removal", async () => {
    boundary.uninstallPostCheckoutHook.mockResolvedValue({ removed: 1, restored: "yes", notes: "not an array" });
    const result = await uninstall();
    expect(result.hook).toEqual({ available: true, removed: false, restored: false, notes: [] });
  });

  it("reports hook and journal failures while returning the remaining uninstall outcome", async () => {
    boundary.uninstallPostCheckoutHook.mockRejectedValue(new Error("hook locked"));
    boundary.appendJournal.mockRejectedValue(new Error("journal read-only"));
    const result = await uninstall();
    expect(result.hook.notes).toEqual(["hook uninstall failed: hook locked"]);
    expect(result.notes).toContain("journal entry could not be written");
    expect(result.policy.kept).toBe(true);
    expect(console.error).toHaveBeenCalledWith("[worktree-uninstall] failed to append journal entry: journal read-only");
  });

  it("propagates repository discovery failure before removing anything", async () => {
    const error = new Error("not a repository");
    boundary.buildProviderContext.mockRejectedValue(error);
    await expect(uninstall()).rejects.toBe(error);
    expect(boundary.uninstallAdapters).not.toHaveBeenCalled();
    expect(boundary.uninstallPostCheckoutHook).not.toHaveBeenCalled();
    expect(boundary.appendJournal).not.toHaveBeenCalled();
  });
});

describe("uninstall output", () => {
  it.each([undefined, null, {}])("renders an incomplete outcome safely: %s", async (result) => {
    const { renderWorktreeUninstall } = await import("./uninstall.js");
    expect(renderWorktreeUninstall(result)).toBe(
      "superskill worktree uninstall\ncache: not touched (pass --purge-local --yes to quarantine it; never deleted)",
    );
  });

  it("names removed adapters, restored hooks, retained policy and reversible cache undo", async () => {
    const { renderWorktreeUninstall } = await import("./uninstall.js");
    const text = renderWorktreeUninstall({
      repoId: "control-repo", repoRoot: MAIN,
      adapters: { available: true, uninstalled: ["claude", "codex"], notes: ["settings kept"] },
      hook: { available: true, removed: true, restored: true, notes: ["hook restored"] },
      policy: { kept: true, path: `${STATE}/policy.json` },
      purgedCache: { journalId: "undo-1", moved: [{ bytes: 1024 }, { bytes: 512 }] },
      notes: ["journal saved"],
    });
    for (const expected of [
      "repo: control-repo", `root: ${MAIN}`, "host adapters: 2 uninstalled (claude, codex)",
      "settings kept", "post-checkout hook: removed, previous hook restored", "hook restored",
      `policy: kept at ${STATE}/policy.json`, "cache quarantined (reversible): 2 dir(s), 1.5 KB — journal undo-1",
      "undo: superskill-cli worktree gc --undo undo-1", "note: journal saved",
    ]) expect(text).toContain(expected);
  });

  it("distinguishes unavailable integrations, absent policy and consent-skipped cache", async () => {
    const { renderWorktreeUninstall } = await import("./uninstall.js");
    const text = renderWorktreeUninstall({
      adapters: { available: false, uninstalled: [], notes: ["registry unavailable"] },
      hook: { available: false, notes: ["module unavailable"] },
      policy: { kept: false, path: null }, cacheSkipped: { reason: "requires --yes" }, notes: [],
    });
    expect(text).toContain("host adapters: not available\n  registry unavailable");
    expect(text).toContain("post-checkout hook: not available\n  module unavailable");
    expect(text).toContain("policy: not present");
    expect(text).toContain("cache: not touched (requires --yes)");
    expect(text).not.toContain("undo:");
  });

  it("does not label unchanged integrations as removed or restore a nonexistent hook", async () => {
    const { renderWorktreeUninstall } = await import("./uninstall.js");
    const text = renderWorktreeUninstall({
      adapters: { available: true, uninstalled: [], notes: [] },
      hook: { available: true, removed: false, restored: false, notes: [] },
      policy: { kept: true, path: null },
    });
    expect(text).toContain("host adapters: 0 uninstalled\n");
    expect(text).toContain("post-checkout hook: unchanged\n");
    expect(text).toContain("policy: not present");
    expect(text).not.toContain("restored");
  });
});

describe("bootstrap guards and seed outcomes", () => {
  it("returns immediately for an unactivated repo without upkeep or seeding", async () => {
    boundary.readPolicy.mockResolvedValue(null);
    const result = await bootstrap();
    expect(result).toEqual({ skipped: true, reason: "repo not activated", worktreeRoot: process.cwd(), notes: [] });
    expect(boundary.readPolicy).toHaveBeenCalledWith(process.cwd());
    expect(boundary.namespaceUpkeep).not.toHaveBeenCalled();
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
  });

  it("does not write session environment unless claudeEnv was requested", async () => {
    const result = await bootstrap({ source: "session" });
    expect(result).toMatchObject({ skipped: true, reason: "claudeEnv not requested", notes: ["namespace checked"] });
    expect(boundary.resolveWorktreeEnv).not.toHaveBeenCalled();
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
    expect(boundary.writeFile).not.toHaveBeenCalled();
  });

  it("explains a missing session environment destination", async () => {
    const result = await bootstrap({ source: "session", claudeEnv: true });
    expect(result).toMatchObject({ skipped: true, reason: "CLAUDE_ENV_FILE not set", claudeEnvFile: null });
    expect(boundary.writeFile).not.toHaveBeenCalled();
  });

  it("honors disabled seeding without skipping namespace upkeep", async () => {
    boundary.readPolicy.mockResolvedValue(policy({ activation: { hooks: true, seed: false, install: false } }));
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "seeding disabled by policy" });
    expect(boundary.namespaceUpkeep).toHaveBeenCalledWith(process.cwd());
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
  });

  it("the bootstrap kill switch prevents both upkeep and seeding on worktree creation", async () => {
    vi.stubEnv("SUPERSKILL_WORKTREE_BOOTSTRAP", "0");
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "disabled by SUPERSKILL_WORKTREE_BOOTSTRAP=0" });
    expect(boundary.namespaceUpkeep).not.toHaveBeenCalled();
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
  });

  it("session environment setup still works when creation-time bootstrapping is disabled", async () => {
    vi.stubEnv("SUPERSKILL_WORKTREE_BOOTSTRAP", "0");
    const result = await sessionEnv({ CACHE: "session-only" });
    expect(result.skipped).toBe(false);
    expect(boundary.namespaceUpkeep).toHaveBeenCalled();
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
    expect(fixture.files.get(ENV_FILE)).toContain("export CACHE='session-only'");
  });

  it("recognizes the main worktree without a filesystem lookup", async () => {
    boundary.readPolicy.mockResolvedValue(policy({ repoRoot: process.cwd() }));
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "main worktree" });
    expect(boundary.realpath).not.toHaveBeenCalled();
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
  });

  it("recognizes aliases of the main worktree through canonical paths", async () => {
    boundary.realpath.mockResolvedValue(MAIN);
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "main worktree" });
    expect(boundary.realpath).toHaveBeenCalledWith(process.cwd());
    expect(boundary.realpath).toHaveBeenCalledWith(MAIN);
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
  });

  it.each([
    { seeded: [{ relative: "node_modules", method: "copy", files: 1, bytes: 12 }], skipped: [], expected: "seeded: node_modules" },
    { seeded: [], skipped: [{ relative: "target", reason: "already present" }], expected: "nothing seeded (target: already present)" },
    { seeded: [], skipped: [], expected: undefined },
  ])("reports the actual seed outcome: $expected", async ({ seeded, skipped, expected }) => {
    boundary.seedWorktree.mockResolvedValue({ seeded, skipped, notes: ["seed inspected"] });
    const result = await bootstrap();
    expect(boundary.seedWorktree).toHaveBeenCalledWith(process.cwd(), { dryRun: false });
    expect(result).toMatchObject({ skipped: seeded.length === 0, seeded: { seeded, skipped } });
    expect(result.reason).toBe(seeded.length === 0 ? "nothing to seed" : undefined);
    expect(result.notes).toEqual(["namespace checked", "seed inspected", ...(expected ? [expected] : [])]);
  });

  it("continues to the seed boundary when canonical path resolution is unavailable", async () => {
    boundary.realpath.mockRejectedValue(new Error("path missing"));
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "nothing to seed" });
    expect(boundary.seedWorktree).toHaveBeenCalled();
  });

  it.each(["readPolicy", "namespaceUpkeep", "seedWorktree"] as const)(
    "turns %s failure into an actionable skipped result", async (name) => {
      boundary[name].mockRejectedValue(new Error(`${name} failed`));
      expect(await bootstrap()).toEqual({
        skipped: true, reason: `${name} failed`, worktreeRoot: process.cwd(), notes: [],
      });
    },
  );

  it("handles non-Error rejections and malformed policy without throwing from a host hook", async () => {
    boundary.readPolicy.mockRejectedValueOnce("policy storage unavailable");
    expect(await bootstrap()).toMatchObject({ skipped: true, reason: "policy storage unavailable" });
    boundary.readPolicy.mockResolvedValue({ repoId: "broken" });
    const malformed = await bootstrap();
    expect(malformed.skipped).toBe(true);
    expect(malformed.reason).toContain("seed");
    expect(boundary.seedWorktree).not.toHaveBeenCalled();
    expect(boundary.writeFile).not.toHaveBeenCalled();
  });
});

describe("bootstrap environment normalization and safe file updates", () => {
  it("accepts tuple and named exports while rejecting invalid names and non-string values", async () => {
    const result = await sessionEnv([
      ["CACHE", "one"], { name: "_VALID_2", value: "two" },
      ["bad-name", "ignored"], ["1BAD", "ignored"], ["NUMBER", 1], [9, "ignored"],
      { name: "MISSING" }, null, false, "not an export",
    ]);
    expect(result.skipped).toBe(false);
    expect(fixture.files.get(ENV_FILE)).toBe(`${BEGIN}\nexport CACHE='one'\nexport _VALID_2='two'\n${END}\n`);
    expect(result.notes).toContain(`wrote 2 env var(s) to ${ENV_FILE}`);
    expect(boundary.resolveWorktreeEnv).toHaveBeenCalledWith(process.cwd());
  });

  it("normalizes nested vars and object-valued environment records", async () => {
    const nested = await sessionEnv({ vars: [["NESTED", "value"]], IGNORED: "not exported" });
    expect(nested.skipped).toBe(false);
    expect(fixture.files.get(ENV_FILE)).toContain("export NESTED='value'");
    const mapped = await sessionEnv({
      PLAIN: "text", WRAPPED: { value: "wrapped" }, WRONG: { value: false },
      NULL: null, NUMBER: 5, "BAD-NAME": "not exported",
    });
    expect(mapped.skipped).toBe(false);
    expect(fixture.files.get(ENV_FILE)).toBe(`${BEGIN}\nexport PLAIN='text'\nexport WRAPPED='wrapped'\n${END}\n`);
  });

  it.each([null, undefined, false, 1, "text", [], { vars: [] }, { INVALID: 7 }])(
    "skips empty or malformed env results without touching the env file: %s", async (raw) => {
      const result = await sessionEnv(raw);
      expect(result).toMatchObject({ skipped: true, reason: "no env vars resolved", claudeEnvFile: ENV_FILE });
      expect(result.notes).toContain("env module returned no variables");
      expect(boundary.readFile).not.toHaveBeenCalled();
      expect(boundary.writeFile).not.toHaveBeenCalled();
    },
  );

  it("explains a missing env resolver export", async () => {
    fixture.env.resolveWorktreeEnv = undefined;
    const result = await sessionEnv([]);
    expect(result).toMatchObject({ skipped: true, reason: "no env vars resolved" });
    expect(result.notes).toContain("env module does not export resolveWorktreeEnv");
    expect(boundary.writeFile).not.toHaveBeenCalled();
  });

  it.each([new Error("resolver failed"), "resolver failed"])(
    "reports resolver failure without writing partial environment: %s", async (error) => {
      vi.stubEnv("CLAUDE_ENV_FILE", ENV_FILE);
      boundary.resolveWorktreeEnv.mockRejectedValue(error);
      const result = await bootstrap({ source: "session", claudeEnv: true });
      expect(result).toMatchObject({ skipped: true, reason: "no env vars resolved" });
      expect(result.notes).toContain("env module unavailable: resolver failed");
      expect(boundary.writeFile).not.toHaveBeenCalled();
    },
  );

  it("refuses newline-only exports before reading or rewriting an existing file", async () => {
    fixture.files.set(ENV_FILE, "# keep me\n");
    const result = await sessionEnv({ LF: "one\ntwo", CR: "one\rtwo" });
    expect(result).toMatchObject({ skipped: true, reason: "no writable env vars", claudeEnvFile: ENV_FILE });
    expect(result.notes).toEqual([
      "namespace checked", "skipped LF: value contains a newline", "skipped CR: value contains a newline",
    ]);
    expect(boundary.readFile).not.toHaveBeenCalled();
    expect(boundary.writeFile).not.toHaveBeenCalled();
    expect(fixture.files.get(ENV_FILE)).toBe("# keep me\n");
  });

  it("quotes shell metacharacters and embedded apostrophes while dropping unsafe values", async () => {
    const result = await sessionEnv({ SAFE: "a'b$HOME;$(echo unsafe)", BAD: "line\nbreak" });
    expect(result.skipped).toBe(false);
    expect(fixture.files.get(ENV_FILE)).toBe(
      `${BEGIN}\nexport SAFE='a'\\''b$HOME;$(echo unsafe)'\n${END}\n`,
    );
    expect(result.notes).toContain("skipped BAD: value contains a newline");
    expect(result.notes).toContain(`wrote 1 env var(s) to ${ENV_FILE}`);
  });

  it.each([
    { name: "empty file", existing: "", prefix: "", suffix: "" },
    { name: "unterminated user line", existing: "# user", prefix: "# user\n", suffix: "" },
    { name: "terminated user line", existing: "# user\n", prefix: "# user\n", suffix: "" },
    { name: "complete managed block", existing: `# before\n${BEGIN}\nexport OLD='old'\n${END}\n# after\n`, prefix: "# before\n", suffix: "# after\n" },
    { name: "end marker without newline", existing: `# before\n${BEGIN}\nold\n${END}# after`, prefix: "# before\n", suffix: "# after" },
    { name: "missing end marker", existing: `# before\n${BEGIN}\nold`, prefix: "# before\n", suffix: "" },
    { name: "stray end marker", existing: `# before\n${END}`, prefix: "# before\n", suffix: "" },
  ])("preserves user content and repairs the $name idempotently", async ({ existing, prefix, suffix }) => {
    fixture.files.set(ENV_FILE, existing);
    const result = await sessionEnv({ CACHE: "new" });
    expect(result.skipped).toBe(false);
    const expected = `${prefix}${BEGIN}\nexport CACHE='new'\n${END}\n${suffix}`;
    expect(fixture.files.get(ENV_FILE)).toBe(expected);
    expect((await sessionEnv({ CACHE: "new" })).skipped).toBe(false);
    expect(fixture.files.get(ENV_FILE)).toBe(expected);
  });

  it("creates an absent env file only through the isolated write boundary", async () => {
    expect((await sessionEnv({ CACHE: "new" })).skipped).toBe(false);
    expect(boundary.writeFile).toHaveBeenCalledWith(
      ENV_FILE, `${BEGIN}\nexport CACHE='new'\n${END}\n`, { encoding: "utf-8" },
    );
  });

  it("does not overwrite an env file that cannot be read", async () => {
    boundary.readFile.mockRejectedValue(Object.assign(new Error("env permission denied"), { code: "EACCES" }));
    const result = await sessionEnv({ CACHE: "new" });
    expect(result).toEqual({ skipped: true, reason: "env permission denied", worktreeRoot: process.cwd(), notes: [] });
    expect(boundary.writeFile).not.toHaveBeenCalled();
  });

  it("reports write failures without claiming exports were installed", async () => {
    fixture.files.set(ENV_FILE, "# original\n");
    boundary.writeFile.mockRejectedValue(new Error("env write denied"));
    const result = await sessionEnv({ CACHE: "new" });
    expect(result).toEqual({ skipped: true, reason: "env write denied", worktreeRoot: process.cwd(), notes: [] });
    expect(fixture.files.get(ENV_FILE)).toBe("# original\n");
  });
});

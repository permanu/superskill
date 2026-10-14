// SPDX-License-Identifier: Apache-2.0

import { lstat, open, opendir, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import matter from "../../lib/markdown-matter.js";
import type { CommandContext } from "../../core/types.js";
import { detectStack } from "../../lib/stack-detector.js";
import { detectTool } from "../../lib/tool-detector.js";
import {
  ensureSuperskillDir,
  loadGraph,
  mutateGraph,
  findNode,
  removeNode,
  addNode,
  addEdge,
} from "../../lib/graph/store.js";
import { normalizeInstalls, normalizeStars } from "../../lib/graph/learner.js";
import { auditHasFailure } from "../../lib/security-gate.js";
import { loadCatalog, packagedCatalogVersion, readBoundedSkillFile } from "../../lib/catalog.js";
import { parseSkillId } from "../../lib/graph/loader.js";
import { registerProject } from "../../lib/project-map.js";
import { validateNativeSkillMetadata, type NativeSkillIssue } from "../../lib/native-skill.js";
import type {
  ProjectNode,
  SkillNode,
  AuditResult,
  AuditStatus,
  SkillPack,
} from "../../lib/graph/schema.js";

export interface InitResult {
  success: boolean;
  project_stack: string[];
  project_tools: string[];
  native_skills_found: number;
  native_skill_compatibility_warnings: Array<{ path: string; issues: NativeSkillIssue[] }>;
  skills_discovered: number;
  skills_blocked: number;
  graph_path: string;
  /** Vault project slug registered for auto-detection. */
  vault_slug?: string;
  /** Path of the written vault project map. */
  vault_mapping?: string;
  /** Why vault registration was skipped (non-fatal). */
  vault_mapping_error?: string;
  error?: string;
}

const SUPER_SKILL_APPEND = `

## SuperSkill
This project uses superskill for skill routing and rules.
- Call the \`superskill\` tool with your task before creative work, debugging, or review.
- No "done" without \`gate check\` evidence.
- Only verified rules are injected by default.
- Worktree caches: run once per repo via MCP tool \`worktree_activate\` (or \`superskill-cli worktree activate\`); it installs a guarded post-checkout hook and shared-cache env for every worktree. Nothing is ever deleted.
- Constitution: catalog/constitution.md in the superskill package (always applies).
`;

async function appendToInstructionFile(projectDir: string): Promise<void> {
  const root = await realpath(projectDir);
  for (const filename of ["AGENTS.md", "CLAUDE.md"]) {
    const filePath = join(root, filename);
    try {
      if ((await lstat(filePath)).isSymbolicLink()) throw new Error(`Initialization refused: symlink at ${filename}`);
      const { bytes } = await readBoundedSkillFile(filePath, [root]);
      const content = bytes.toString("utf-8");
      if (content.includes("## SuperSkill")) continue;
      const handle = await open(filePath, constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        if (!(await handle.stat()).isFile()) throw new Error(`Instruction path is not a regular file: ${filename}`);
        await handle.writeFile(SUPER_SKILL_APPEND, "utf-8");
      } finally {
        await handle.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      console.error(`[skill-init] failed to update ${filename}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

function getSkillDirectories(projectDir: string): string[] {
  return [
    resolve(projectDir, ".agents", "skills"),
    resolve(projectDir, ".superskill", "skills"),
    resolve(projectDir, ".claude", "skills"),
  ];
}

async function scanNativeSkillDirs(projectDir: string): Promise<string[]> {
  const dirs = getSkillDirectories(await realpath(projectDir));
  const skillFiles: string[] = [];
  const budget = { entries: 0 };

  for (const dir of dirs) {
    try {
      if (await realpath(dir) !== dir) throw new Error(`Symlinked native skill source root rejected: ${dir}`);
      await collectSkillFiles(dir, skillFiles, budget);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") {
        console.error(`[skill-init] failed to scan ${dir}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  }

  return skillFiles;
}

async function collectSkillFiles(
  dir: string,
  results: string[],
  budget: { entries: number },
  depth = 0,
): Promise<void> {
  if (depth > 5) return;
  try {
    const entries = await opendir(dir);
    for await (const entry of entries) {
      if (++budget.entries > 10_000) throw new Error("Native skill scan entry limit exceeded");
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") && entry.name !== ".claude" && entry.name !== ".agents") continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        await collectSkillFiles(fullPath, results, budget, depth + 1);
      } else if (entry.isFile() && entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
  }
}

export interface ParsedNativeSkill {
  name: string;
  audits?: AuditResult;
  installs?: number;
  stars?: number;
  source?: string;
  pack?: SkillPack;
  langs?: string[];
  triggers?: string[];
  always?: boolean;
}

interface NativeSkillInspection {
  parsed: ParsedNativeSkill | null;
  compatibilityIssues: NativeSkillIssue[];
}

const TRIGGER_STOPWORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "this", "that", "these", "those", "some", "any", "all",
  "both", "each", "every", "no", "not", "only", "own", "same", "such",
  "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
  "through", "during", "before", "after", "above", "below", "between", "out",
  "off", "over", "under", "about", "up", "to",
  "and", "or", "but", "if", "while", "because", "so", "than", "then", "when",
  "where", "why", "how", "once", "again", "further",
  "it", "its", "my", "me", "i", "we", "our", "you", "your", "he", "she",
  "they", "them", "their", "his", "her",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might",
  "shall", "can", "must", "need",
  "use", "uses", "used", "using", "user", "users", "want", "wants", "wanted",
  "ask", "asks", "asked", "help", "helps", "helping", "make", "makes",
  "making", "get", "gets", "give", "gives", "let", "lets", "try", "tries",
  "find", "finds", "show", "shows", "provide", "provides", "including",
  "include", "includes", "ensure", "ensures", "allow", "allows", "enable",
  "enables", "support", "supports", "also", "via", "like", "well", "skill",
  "skills", "whenever",
]);

const SHORT_TRIGGER_ALLOWLIST: ReadonlySet<string> = new Set([
  "ui", "ux", "ai", "qa", "db", "ci", "ml", "xr", "vr", "ar", "3d",
]);

const MAX_DERIVED_TRIGGERS = 24;

export function deriveTriggers(name: string, description: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  const tokens = `${name} ${description}`.toLowerCase().split(/[^a-z0-9]+/);

  for (const token of tokens) {
    if (token === "" || seen.has(token)) continue;
    if (token.length < 3 && !SHORT_TRIGGER_ALLOWLIST.has(token)) continue;
    if (TRIGGER_STOPWORDS.has(token)) continue;
    seen.add(token);
    terms.push(token);
    if (terms.length >= MAX_DERIVED_TRIGGERS) break;
  }

  return terms;
}

async function inspectNativeSkillFile(filePath: string): Promise<NativeSkillInspection> {
  try {
    if ((await lstat(filePath)).isSymbolicLink()) throw new Error(`Symlinked native skill file rejected: ${filePath}`);
    const { bytes } = await readBoundedSkillFile(filePath, [await realpath(dirname(filePath))]);
    const content = bytes.toString("utf-8");
    const { data } = matter(content);
    const compatibilityIssues = validateNativeSkillMetadata(data)
      .filter((issue) => issue.severity === "error");
    const name = typeof data.name === "string" ? data.name : "";
    if (!name || parseSkillId(`native/${name}`)?.source !== "native") return { parsed: null, compatibilityIssues };

    const result: ParsedNativeSkill = { name };

    if (data.audits && typeof data.audits === "object") {
      const a = data.audits as Record<string, unknown>;
      const status = (value: unknown): AuditStatus => value === "pass" || value === "warn" || value === "fail" ? value : "unknown";
      result.audits = {
        gen: status(a.gen),
        socket: status(a.socket),
        snyk: status(a.snyk),
      };
    }

    if (Number.isSafeInteger(data.installs) && data.installs >= 0) result.installs = data.installs;
    if (Number.isSafeInteger(data.stars) && data.stars >= 0) result.stars = data.stars;
    if (typeof data.source === "string") result.source = data.source;
    if (typeof data.pack === "string" && /^(?:memory|code|review|security|ops|devops|optimizer|pipeline|watchdog|ui)$/.test(data.pack)) result.pack = data.pack as SkillPack;
    if (Array.isArray(data.langs)) result.langs = data.langs.filter((v): v is string => typeof v === "string");
    const explicitTriggers = Array.isArray(data.triggers)
      ? data.triggers.filter((v): v is string => typeof v === "string")
      : [];
    if (explicitTriggers.length > 0) {
      result.triggers = explicitTriggers;
    } else if (typeof data.description === "string" && data.description.trim() !== "") {
      const derived = deriveTriggers(name, data.description);
      if (derived.length > 0) result.triggers = derived;
    }
    if (data.always === true) result.always = true;

    return { parsed: result, compatibilityIssues };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ENOTDIR") console.error(`[skill-init] failed to parse ${filePath}: ${code ?? "invalid native skill file"}`);
    return {
      parsed: null,
      compatibilityIssues: [{
        code: "metadata.unreadable",
        field: "SKILL.md",
        severity: "error",
        message: "Native skill metadata could not be read safely; the file was excluded from native routing.",
      }],
    };
  }
}

export async function parseNativeSkillFile(filePath: string): Promise<ParsedNativeSkill | null> {
  return (await inspectNativeSkillFile(filePath)).parsed;
}

export async function initProject(
  args: Record<string, unknown>,
  ctx: CommandContext,
  options: { startup?: boolean } = {},
): Promise<InitResult> {
  const projectDir = ctx.workspacePath ?? process.cwd();

  try {
    if (args.bridge === true) throw new Error("Native skill bridge is unsupported; existing native skills are left unchanged");
    await realpath(projectDir);
    for (const relativePath of [".superskill", ".superskill/graph.json", ".superskill/graph.lock", ".gitignore", "AGENTS.md", "CLAUDE.md"]) {
      try {
        const info = await lstat(join(projectDir, relativePath));
        if (info.isSymbolicLink()) throw new Error(`Initialization refused: symlink at ${relativePath}`);
        if (relativePath === ".superskill" ? !info.isDirectory() : !info.isFile()) throw new Error(`Initialization refused: invalid file type at ${relativePath}`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    await loadGraph(projectDir);
    const [stack, tool] = await Promise.all([
      detectStack(projectDir),
      Promise.resolve(detectTool()),
    ]);

    const projectStack = [...stack.languages, ...stack.frameworks, ...stack.buildTools];
    const projectTools = tool.tool !== "unknown" ? [tool.tool] : [];

    const nativeFiles = await scanNativeSkillDirs(projectDir);
    const nativeRoot = await realpath(projectDir);
    const nativeSkillCompatibilityWarnings: InitResult["native_skill_compatibility_warnings"] = [];
    const nativeSkills: Array<{
      id: string;
      name: string;
      audits?: AuditResult;
      installs?: number;
      stars?: number;
      source?: string;
      pack?: SkillPack;
      langs?: string[];
      triggers?: string[];
      always?: boolean;
    }> = [];
    const seenNames = new Set<string>();

    for (const filePath of nativeFiles) {
      const inspection = await inspectNativeSkillFile(filePath);
      if (inspection.compatibilityIssues.length > 0) {
        nativeSkillCompatibilityWarnings.push({
          path: relative(nativeRoot, filePath),
          issues: inspection.compatibilityIssues,
        });
      }
      const parsed = inspection.parsed;
      if (!parsed || seenNames.has(parsed.name)) continue;
      seenNames.add(parsed.name);
      nativeSkills.push({
        id: `native/${parsed.name}`,
        name: parsed.name,
        audits: parsed.audits,
        installs: parsed.installs,
        stars: parsed.stars,
        source: parsed.source,
        pack: parsed.pack,
        langs: parsed.langs,
        triggers: parsed.triggers,
        always: parsed.always,
      });
    }

    const catalog = await loadCatalog();
    const catalogIds = new Set(catalog.map((s) => s.id));

    let skillsBlocked = 0;
    const blockedIds = new Set<string>();
    const skillNodes: SkillNode[] = [];

    for (const item of catalog) {
      skillNodes.push({
        type: "skill",
        id: item.id,
        source: "catalog",
        audits: { gen: "pass", socket: "pass", snyk: "pass" },
        installs: 0,
        stars: 0,
        w: 0.8,
        ts: Date.now(),
        pack: item.pack,
        langs: item.langs,
        triggers: item.triggers,
        always: item.always,
        path: item.path,
      });
    }

    for (const native of nativeSkills) {
      if (catalogIds.has(native.id) || catalogIds.has(native.name)) continue;
      const audits = native.audits ?? { gen: "unknown", socket: "unknown", snyk: "unknown" };

      if (auditHasFailure(audits)) {
        skillsBlocked++;
        blockedIds.add(native.id);
        continue;
      }

      const installs = native.installs ?? 0;
      const stars = native.stars ?? 0;

      skillNodes.push({
        type: "skill",
        id: native.id,
        source: native.source === "skills.sh" ? "routed" as const : "native" as const,
        audits,
        installs,
        stars,
        w: installs > 0 || stars > 0
          ? Math.max(normalizeInstalls(installs), normalizeStars(stars))
          : 0.8,
        ts: Date.now(),
        pack: native.pack,
        langs: native.langs,
        triggers: native.triggers,
        always: native.always,
      });
    }

    const projectNode: ProjectNode = {
      type: "project",
      id: "project",
      stack: projectStack,
      tools: projectTools,
      phase: "explore",
      ts: Date.now(),
    };

    const superskillDir = await ensureSuperskillDir(projectDir);
    await mutateGraph(projectDir, (latest) => {
      const existingProject = findNode<ProjectNode>(latest, "project", "project");
      let graph = addNode(latest, { ...projectNode, phase: existingProject?.phase ?? projectNode.phase });
      for (const node of latest.nodes) {
        if (node.type === "skill" && node.source === "catalog" && !catalogIds.has(node.id)) graph = removeNode(graph, "skill", node.id);
      }
      for (const id of blockedIds) graph = removeNode(graph, "skill", id);
      for (const skill of skillNodes) {
        const existingSkill = findNode<SkillNode>(graph, "skill", skill.id);
        graph = addNode(graph, { ...skill, w: existingSkill?.w ?? skill.w });
        if (!graph.edges.some((edge) => edge.type === "project_skill" && edge.from === "project" && edge.to === skill.id)) {
          graph = addEdge(graph, {
            type: "project_skill",
            from: "project",
            to: skill.id,
            w: skill.w,
            activations: 0,
          });
        }
      }
      return { ...graph, catalogVersion: packagedCatalogVersion };
    });

    if (!options.startup) await appendToInstructionFile(projectDir);

    let vaultSlug: string | undefined = options.startup ? ctx.projectSlug ?? undefined : undefined;
    let vaultMapping: string | undefined;
    let vaultMappingError: string | undefined;
    if (!options.startup) try {
      const registration = await registerProject(
        ctx.vaultPath,
        projectDir,
        typeof args.slug === "string" && args.slug.trim() !== "" ? args.slug : undefined,
      );
      vaultSlug = registration.slug;
      vaultMapping = registration.map_path;
    } catch (e) {
      vaultMappingError = e instanceof Error ? e.message : String(e);
    }

    return {
      success: true,
      project_stack: projectStack,
      project_tools: projectTools,
      native_skills_found: nativeSkills.length,
      native_skill_compatibility_warnings: nativeSkillCompatibilityWarnings,
      skills_discovered: catalog.length,
      skills_blocked: skillsBlocked,
      graph_path: join(superskillDir, "graph.json"),
      vault_slug: vaultSlug,
      vault_mapping: vaultMapping,
      vault_mapping_error: vaultMappingError,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skill-init] initProject failed: ${msg}`);
    return {
      success: false,
      project_stack: [],
      project_tools: [],
      native_skills_found: 0,
      native_skill_compatibility_warnings: [],
      skills_discovered: 0,
      skills_blocked: 0,
      graph_path: join(projectDir, ".superskill", "graph.json"),
      error: msg,
    };
  }
}

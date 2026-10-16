import { opendir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { catalogFile, catalogRoot } from "./catalog.js";
import { logDiagnostic } from "./safe-diagnostics.js";

const MAX_ID_LENGTH = 400;
const MAX_NATIVE_DIRECTORIES = 1000;
const MAX_NATIVE_ENTRIES = 10_000;
const MAX_NATIVE_DEPTH = 5;

export type ParsedSkillId =
  | { source: "catalog"; id: string }
  | { source: "native"; name: string }
  | { source: "cache"; owner: string; repo: string; name: string };

export interface ResolvedSkillSource {
  id: string;
  source: "native" | "catalog" | "cache";
  file: string;
  baseDir: string;
  allowedRoots: string[];
}

interface NativeSearchBudget {
  directories: number;
  entries: number;
}

function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENOENT" || code === "ENOTDIR";
}

function logUnexpected(error: unknown): void {
  if (!isMissing(error)) logDiagnostic("skill.source-read-failed", error);
}

function within(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function parseSkillId(id: string): ParsedSkillId | null {
  if (typeof id !== "string" || id.length > MAX_ID_LENGTH) return null;
  const native = /^native\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/.exec(id);
  if (native) return { source: "native", name: native[1] };
  const cached = /^([A-Za-z0-9_.-]{1,128})\/([A-Za-z0-9_.-]{1,128})@([A-Za-z0-9][A-Za-z0-9._-]{0,127})$/.exec(id);
  if (cached) {
    if ([cached[1], cached[2]].some((part) => part === "." || part === "..")) return null;
    return { source: "cache", owner: cached[1], repo: cached[2], name: cached[3] };
  }
  try {
    catalogFile(id);
    return { source: "catalog", id };
  } catch {
    return null;
  }
}

async function realpathOrNull(path: string): Promise<string | null> {
  try {
    return await realpath(path);
  } catch (error) {
    if (isMissing(error)) return null;
    logUnexpected(error);
    throw error;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (isMissing(error)) return false;
    logUnexpected(error);
    throw error;
  }
}

async function isRegularFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (isMissing(error)) return false;
    logUnexpected(error);
    throw error;
  }
}

async function findNativeSkillFile(
  root: string,
  skillName: string,
  budget: NativeSearchBudget,
  depth = 0,
): Promise<string | null> {
  if (depth > MAX_NATIVE_DEPTH) return null;
  if (++budget.directories > MAX_NATIVE_DIRECTORIES) throw new Error("Native skill directory search limit exceeded");

  const direct = join(root, skillName, "SKILL.md");
  if (await isRegularFile(direct)) return direct;

  let entries;
  try {
    entries = await opendir(root);
  } catch (error) {
    if (isMissing(error)) return null;
    logUnexpected(error);
    throw error;
  }

  try {
    for await (const entry of entries) {
      if (++budget.entries > MAX_NATIVE_ENTRIES) throw new Error("Native skill entry search limit exceeded");
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
      const nested = await findNativeSkillFile(join(root, entry.name), skillName, budget, depth + 1);
      if (nested !== null) return nested;
    }
  } catch (error) {
    if (!isMissing(error)) logUnexpected(error);
    throw error;
  }
  return null;
}

async function containedFile(
  id: string,
  source: ResolvedSkillSource["source"],
  path: string,
  allowedRoots: string[],
): Promise<ResolvedSkillSource | null> {
  const file = await realpathOrNull(path);
  if (file === null) return null;
  const allowedRoot = allowedRoots.find((root) => within(root, file));
  if (!allowedRoot) {
    logDiagnostic("skill.source-rejected", undefined);
    return null;
  }
  if (!(await isRegularFile(file))) return null;
  return { id, source, file, baseDir: dirname(file), allowedRoots };
}

async function resolveNative(
  projectDir: string,
  id: string,
  name: string,
): Promise<ResolvedSkillSource | null> {
  const projectRoot = await realpathOrNull(projectDir);
  if (!projectRoot) return null;
  const budget = { directories: 0, entries: 0 };

  for (const hiddenDir of [".agents", ".superskill", ".claude"]) {
    const root = join(projectRoot, hiddenDir, "skills");
    const resolvedRoot = await realpathOrNull(root);
    if (!resolvedRoot) continue;
    if (resolvedRoot !== root) {
      logDiagnostic("skill.source-rejected", undefined);
      continue;
    }
    if (!(await isDirectory(root))) continue;
    const path = await findNativeSkillFile(root, name, budget);
    if (!path) continue;
    const source = await containedFile(id, "native", path, [root]);
    if (source) return source;
  }
  return null;
}

async function trustedCacheRoots(projectRoot: string): Promise<{ localRoot: string; roots: string[] }> {
  const localRoot = join(projectRoot, ".superskill", "skill-cache");
  const homeRoot = await realpathOrNull(homedir());
  const globalRoot = homeRoot ? join(homeRoot, ".superskill", "skills") : null;
  const roots: string[] = [];

  for (const root of [localRoot, globalRoot].filter((path): path is string => path !== null)) {
    const resolvedRoot = await realpathOrNull(root);
    if (resolvedRoot === root && await isDirectory(root)) roots.push(root);
  }

  return { localRoot, roots };
}

async function resolveCache(
  projectDir: string,
  id: string,
  owner: string,
  repo: string,
  name: string,
): Promise<ResolvedSkillSource | null> {
  const projectRoot = await realpathOrNull(projectDir);
  if (!projectRoot) return null;
  const { localRoot, roots } = await trustedCacheRoots(projectRoot);
  if (roots.length === 0) return null;
  const path = join(localRoot, owner, repo, name, "SKILL.md");
  const source = await containedFile(id, "cache", path, roots);
  if (!source) return null;
  if (!roots.some((root) => source.file === join(root, owner, repo, name, "SKILL.md"))) {
    logDiagnostic("skill.source-rejected", undefined);
    return null;
  }
  return source;
}

async function resolveCatalog(id: string): Promise<ResolvedSkillSource | null> {
  const root = await realpathOrNull(catalogRoot());
  if (!root) return null;
  return containedFile(id, "catalog", catalogFile(id), [root]);
}

export async function resolveSkillSource(
  projectDir: string,
  skillId: string,
): Promise<ResolvedSkillSource | null> {
  const parsed = parseSkillId(skillId);
  if (!parsed) return null;
  if (parsed.source === "native") return resolveNative(projectDir, skillId, parsed.name);
  if (parsed.source === "catalog") return resolveCatalog(parsed.id);
  return resolveCache(projectDir, skillId, parsed.owner, parsed.repo, parsed.name);
}

// SPDX-License-Identifier: Apache-2.0

import { lstat, realpath } from "node:fs/promises";
import type { Stats } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import matter from "../../lib/markdown-matter.js";
import type { CommandContext } from "../../core/types.js";
import { MAX_SKILL_FILE_BYTES, readBoundedSkillFile } from "../../lib/catalog.js";
import { validateNativeSkillMetadata, type NativeSkillIssue, type NativeSkillProfile } from "../../lib/native-skill.js";

const MAX_REFERENCE_CANDIDATES = 2048;
const MAX_REFERENCE_PATH_LENGTH = 4096;
const MAX_REFERENCE_PATH_PARTS = 32;
const MAX_REFERENCE_TEXT_BYTES = 4 * MAX_SKILL_FILE_BYTES;
const TEXT_REFERENCE_EXTENSIONS = new Set([".md", ".markdown", ".mdx", ".txt", ".text", ".rst", ".adoc"]);
const BINARY_ASSET_EXTENSIONS = new Set([".png", ".pdf"]);

export interface ValidateNativeSkillArgs {
  path?: string;
  profile?: NativeSkillProfile;
}

export interface NativeSkillValidationReport {
  success: boolean;
  valid: boolean;
  profile: NativeSkillProfile;
  issues: NativeSkillIssue[];
  counts: { errors: number; warnings: number };
  checked_paths: string[];
}

interface Reference {
  target: string;
  offset: number;
  optional: boolean;
  label?: string;
}

class SafePathError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function makeIssue(code: string, message: string, severity: NativeSkillIssue["severity"] = "error", field?: string): NativeSkillIssue {
  return { code, message, severity, ...(field ? { field } : {}) };
}

function hasDirectOptionalClause(body: string, linkOffset: number): boolean {
  const prefix = body.slice(Math.max(0, linkOffset - 80), linkOffset);
  const clauseStart = Math.max(
    prefix.lastIndexOf("\n"),
    prefix.lastIndexOf("."),
    prefix.lastIndexOf("!"),
    prefix.lastIndexOf("?"),
    prefix.lastIndexOf(";"),
  );
  return /^\s*optional(?:ly)?(?:\s+[\w-]+){0,3}\s*:?\s*$/i.test(prefix.slice(clauseStart + 1));
}

function extractReferences(body: string): { references: Reference[]; limitExceeded: boolean } {
  const references: Reference[] = [];
  const seen = new Set<string>();
  const patterns: Array<{ expression: RegExp; target: number; fallback?: number; label?: number }> = [
    { expression: /!?\[([^\]]*)\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+[^)]*)?\)/g, target: 2, fallback: 3, label: 1 },
    { expression: /^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>\n]+)>|(\S+))/gm, target: 2, fallback: 3, label: 1 },
    { expression: /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi, target: 1 },
    { expression: /\b(?:python(?:3(?:\.\d+)?)?|node|bun|deno|bash|sh|ruby|perl|php)\s+["']?((?:\.\.\/|\.\/|(?:scripts|references|resources|assets|templates)\/)[^\s"'`]+|[A-Za-z0-9._/-]+\.(?:py|js|mjs|cjs|ts|mts|cts|sh|rb|pl|php))\b/g, target: 1 },
    { expression: /(?:^|[\s(`])((?:\.\.\/|\.\/)[A-Za-z0-9._/-]+\.(?:py|js|mjs|cjs|ts|mts|cts|sh|rb|pl|php))/gm, target: 1 },
    { expression: /(?:^|[\s(`])((?:scripts|references|resources|assets|templates)\/[A-Za-z0-9._/-]+)/gm, target: 1 },
  ];

  for (const { expression, target, fallback, label } of patterns) {
    for (const match of body.matchAll(expression)) {
      const targetValue = match[target] ?? (fallback ? match[fallback] : undefined);
      if (!targetValue) continue;
      const offset = match.index ?? 0;
      const targetOffset = offset + match[0].lastIndexOf(targetValue);
      const key = `${targetOffset}\0${targetValue}`;
      if (seen.has(key)) continue;
      if (references.length >= MAX_REFERENCE_CANDIDATES) return { references, limitExceeded: true };
      seen.add(key);
      const targetPosition = match[0].lastIndexOf(targetValue);
      const afterTarget = match[0].slice(targetPosition + targetValue.length);
      const labelValue = label ? match[label] : undefined;
      const optional = Boolean(labelValue && /\boptional\b/i.test(labelValue)) ||
        /["'][^"']*\boptional\b[^"']*["']/i.test(afterTarget) ||
        hasDirectOptionalClause(body, offset);
      references.push({
        target: targetValue,
        offset: targetOffset,
        optional,
        ...(labelValue ? { label: labelValue } : {}),
      });
    }
  }

  return { references, limitExceeded: false };
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let lines = 1;
  for (let index = 0; index < content.length; index++) {
    if (content[index] === "\r") {
      lines++;
      if (content[index + 1] === "\n") index++;
    } else if (content[index] === "\n") {
      lines++;
    }
  }
  if (content.endsWith("\n") || content.endsWith("\r")) lines--;
  return lines;
}

function countSkillBodyLines(body: string): number {
  if (body.startsWith("\r\n")) return countLines(body.slice(2));
  if (body.startsWith("\n") || body.startsWith("\r")) return countLines(body.slice(1));
  return countLines(body);
}

function hasUsefulTableOfContents(content: string): boolean {
  const structuredLinkLine = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+.*\[[^\]]+\](?:\([^)]*\)|[ \t]*\[[^\]]*\])/gm;
  let structuredLinkLines = 0;
  for (const _line of content.matchAll(structuredLinkLine)) {
    if (++structuredLinkLines >= 2) return true;
  }
  const hasContentsHeading = /^[ \t]*#{1,6}[ \t]*(?:table of contents|contents|index|reference index)\b/im.test(content);
  return hasContentsHeading && /\[[^\]]+\]\([^)]*\)/.test(content);
}

function shouldScanForTableOfContents(path: string): boolean {
  const extension = extname(path).toLowerCase();
  if (BINARY_ASSET_EXTENSIONS.has(extension)) return false;
  return TEXT_REFERENCE_EXTENSIONS.has(extension);
}

function localReferencePath(rawTarget: string): { path?: string; escaping?: boolean; tooLong?: boolean } {
  const target = rawTarget.trim().replace(/^<|>$/g, "");
  if (target === "" || target.startsWith("#")) return {};
  const slashNormalized = target.replace(/\\/g, "/");
  if (slashNormalized.startsWith("//") || /^[a-z]:/i.test(slashNormalized) || /^file:/i.test(slashNormalized)) return { escaping: true };
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) return {};
  if (target.length > MAX_REFERENCE_PATH_LENGTH) return { tooLong: true };
  const withoutQueryOrFragment = target.split(/[?#]/, 1)[0];
  if (withoutQueryOrFragment === "") return {};

  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQueryOrFragment);
  } catch {
    return { escaping: true };
  }
  const normalized = decoded.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:/i.test(normalized) || /^file:/i.test(normalized) || normalized.includes("\0")) return { escaping: true };
  const parts = normalized.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.some((part) => part === "..")) return { escaping: true };
  if (parts.length > MAX_REFERENCE_PATH_PARTS) return { tooLong: true };
  return parts.length > 0 ? { path: parts.join(sep) } : {};
}

async function statWithoutSymlinks(root: string, relativePath: string): Promise<{ path: string; realPath: string; info: Stats }> {
  const parts = relativePath.split(sep).filter(Boolean);
  let current = root;
  for (let index = 0; index < parts.length; index++) {
    current = join(current, parts[index]);
    let info: Stats;
    try {
      info = await lstat(current, { bigint: false });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN";
      throw new SafePathError(code);
    }
    if (info.isSymbolicLink()) throw new SafePathError("SYMLINK");
    if (index < parts.length - 1 && !info.isDirectory()) throw new SafePathError("NOT_DIRECTORY");
    if (index === parts.length - 1) {
      let physical: string;
      try {
        physical = await realpath(current);
      } catch {
        throw new SafePathError("UNRESOLVABLE");
      }
      if (!isWithin(root, physical)) throw new SafePathError("ESCAPE");
      return { path: current, realPath: physical, info };
    }
  }
  throw new SafePathError("EMPTY_PATH");
}

function issueForSafePath(error: unknown, missingCode: string, missingMessage: string): NativeSkillIssue {
  if (!(error instanceof SafePathError)) return makeIssue(missingCode, missingMessage);
  if (error.code === "SYMLINK") return makeIssue("path.symlink", "Symlinked skill paths and references are not allowed.");
  if (error.code === "ESCAPE") return makeIssue("path.escape", "The skill path resolves outside its allowed directory.");
  if (error.code === "ENOENT") return makeIssue(missingCode, missingMessage);
  if (error.code === "NOT_DIRECTORY" || error.code === "ENOTDIR") return makeIssue("path.not-directory", "A path component is not a directory.");
  return makeIssue("path.unsafe", "The requested path could not be checked safely.");
}

function makeReport(profile: NativeSkillProfile, issues: NativeSkillIssue[], checkedPaths: Set<string>): NativeSkillValidationReport {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  const valid = errors === 0;
  return {
    success: valid,
    valid,
    profile,
    issues,
    counts: { errors, warnings },
    checked_paths: [...checkedPaths].sort(),
  };
}

export async function validateNativeSkillCommand(
  args: ValidateNativeSkillArgs,
  ctx: CommandContext,
): Promise<NativeSkillValidationReport> {
  const issues: NativeSkillIssue[] = [];
  const checkedPaths = new Set<string>();
  const profile: NativeSkillProfile = args.profile === "portable" ? "portable" : "anthropic";

  if (args.profile !== undefined && args.profile !== "portable" && args.profile !== "anthropic") {
    issues.push(makeIssue("profile.invalid", "Choose the anthropic or portable validation profile.", "error", "profile"));
    return makeReport(profile, issues, checkedPaths);
  }
  if (typeof args.path !== "string" || args.path.trim() === "") {
    issues.push(makeIssue("path.required", "Provide a workspace-relative SKILL.md path or skill directory.", "error", "path"));
    return makeReport(profile, issues, checkedPaths);
  }
  if (!ctx.workspacePath) {
    issues.push(makeIssue("workspace.unavailable", "No source workspace is available for native skill validation.", "error", "workspace"));
    return makeReport(profile, issues, checkedPaths);
  }

  let workspaceRoot: string;
  try {
    workspaceRoot = await realpath(ctx.workspacePath);
    if (!(await lstat(workspaceRoot, { bigint: false })).isDirectory()) throw new SafePathError("NOT_DIRECTORY");
  } catch {
    issues.push(makeIssue("workspace.unavailable", "The source workspace could not be resolved safely.", "error", "workspace"));
    return makeReport(profile, issues, checkedPaths);
  }

  const requestedPath = args.path.trim();
  if (isAbsolute(requestedPath) || /^[A-Za-z]:[\\/]/.test(requestedPath) || requestedPath.startsWith("\\\\") || requestedPath.includes("\0")) {
    issues.push(makeIssue("path.not-relative", "Use a workspace-relative SKILL.md path or skill directory.", "error", "path"));
    return makeReport(profile, issues, checkedPaths);
  }
  const lexicalParts = requestedPath.split(/[\\/]/);
  if (lexicalParts.some((part) => part === "..")) {
    issues.push(makeIssue("path.escape", "The requested skill path must stay inside the workspace.", "error", "path"));
    return makeReport(profile, issues, checkedPaths);
  }
  const normalizedRequestedPath = requestedPath.replace(/[\\/]/g, sep);
  const absoluteRequestedPath = resolve(workspaceRoot, normalizedRequestedPath);
  const workspaceRelativePath = relative(workspaceRoot, absoluteRequestedPath);
  if (!workspaceRelativePath || workspaceRelativePath === ".." || workspaceRelativePath.startsWith(`..${sep}`) || isAbsolute(workspaceRelativePath)) {
    issues.push(makeIssue("path.escape", "The requested skill path must stay inside the workspace.", "error", "path"));
    return makeReport(profile, issues, checkedPaths);
  }

  let skillDirectory: string;
  let metadataRelative: string;
  try {
    const requested = await statWithoutSymlinks(workspaceRoot, workspaceRelativePath);
    if (requested.info.isDirectory()) {
      skillDirectory = requested.realPath;
      metadataRelative = join(workspaceRelativePath, "SKILL.md");
    } else if (requested.info.isFile() && requested.path.split(sep).at(-1) === "SKILL.md") {
      metadataRelative = workspaceRelativePath;
      skillDirectory = dirname(requested.realPath);
    } else {
      issues.push(makeIssue("path.expected-skill", "The selected file must be named SKILL.md, or select its skill directory.", "error", "path"));
      return makeReport(profile, issues, checkedPaths);
    }
  } catch (error) {
    issues.push(issueForSafePath(error, "path.missing", "The requested skill path does not exist inside the workspace."));
    return makeReport(profile, issues, checkedPaths);
  }

  let metadataFile: { path: string; realPath: string; info: Stats };
  try {
    metadataFile = await statWithoutSymlinks(workspaceRoot, metadataRelative);
    if (!metadataFile.info.isFile()) {
      issues.push(makeIssue("metadata.not-file", "SKILL.md must be a regular file.", "error", "SKILL.md"));
      return makeReport(profile, issues, checkedPaths);
    }
    if (relative(skillDirectory, metadataFile.realPath).startsWith(`..${sep}`) || !isWithin(skillDirectory, metadataFile.realPath)) {
      issues.push(makeIssue("metadata.escape", "SKILL.md resolves outside its skill directory.", "error", "SKILL.md"));
      return makeReport(profile, issues, checkedPaths);
    }
  } catch (error) {
    issues.push(issueForSafePath(error, "metadata.missing", "The selected skill directory does not contain SKILL.md."));
    return makeReport(profile, issues, checkedPaths);
  }

  const relativeSkillPath = relative(workspaceRoot, metadataFile.realPath);
  checkedPaths.add(relativeSkillPath);

  let content: string;
  try {
    const { bytes } = await readBoundedSkillFile(metadataFile.realPath, [skillDirectory], MAX_SKILL_FILE_BYTES);
    content = bytes.toString("utf-8");
  } catch {
    issues.push(makeIssue("metadata.read", "SKILL.md could not be read as a bounded, stable regular file (maximum 1 MiB).", "error", "SKILL.md"));
    return makeReport(profile, issues, checkedPaths);
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(content);
  } catch {
    issues.push(makeIssue("metadata.parse", "SKILL.md frontmatter could not be parsed as data-only YAML or JSON.", "error", "frontmatter"));
    return makeReport(profile, issues, checkedPaths);
  }

  issues.push(...validateNativeSkillMetadata(parsed.data, profile));
  const body = parsed.content;
  if (countSkillBodyLines(body) > 500) {
    issues.push(makeIssue("body.line-limit", "The skill body exceeds the recommended 500 lines; consider moving supporting detail into referenced files.", "warning", "body"));
  }

  const referenceScan = extractReferences(body);
  if (referenceScan.limitExceeded) {
    issues.push(makeIssue("references.limit", `Skill reference scan exceeds the ${MAX_REFERENCE_CANDIDATES} candidate limit.`, "error", "body"));
  }

  const seenReferences = new Set<string>();
  let textReferenceBytes = 0;
  let textReferenceBudgetExceeded = false;
  for (const reference of referenceScan.references) {
    const parsedReference = localReferencePath(reference.target);
    if (parsedReference.tooLong) {
      issues.push(makeIssue("reference.path-limit", "A local reference exceeds the safe path length or depth limit.", "error", "references"));
      continue;
    }
    if (!parsedReference.path && !parsedReference.escaping) continue;
    if (parsedReference.escaping) {
      issues.push(makeIssue("reference.escape", "A local reference escapes the skill directory.", "error", "references"));
      continue;
    }
    const target = parsedReference.path!;
    if (seenReferences.has(target)) continue;
    const referenceField = target.split(sep).join("/");
    let targetFile: { realPath: string; info: Stats };
    try {
      targetFile = await statWithoutSymlinks(skillDirectory, target);
    } catch (error) {
      if (error instanceof SafePathError && error.code === "SYMLINK") {
        issues.push(makeIssue("reference.symlink", "A local reference resolves through a symlink, which is not allowed.", "error", referenceField));
      } else if (!(error instanceof SafePathError) || error.code !== "ENOENT") {
        const issue = issueForSafePath(error, "reference.missing", "A required local reference does not exist inside the skill directory.");
        issues.push({ ...issue, field: referenceField });
      } else if (!reference.optional) {
        seenReferences.add(target);
        issues.push(makeIssue("reference.missing", "A required local reference does not exist inside the skill directory.", "error", referenceField));
      }
      continue;
    }
    if (!targetFile.info.isFile()) {
      seenReferences.add(target);
      issues.push(makeIssue("reference.not-file", "A local skill reference must point to a regular file.", "error", referenceField));
      continue;
    }
    seenReferences.add(target);
    checkedPaths.add(relative(workspaceRoot, targetFile.realPath));

    if (!shouldScanForTableOfContents(target)) continue;
    if (targetFile.info.size > MAX_SKILL_FILE_BYTES) {
      issues.push(makeIssue("reference.text-limit", "A text reference exceeds the 1 MiB scan limit.", "error", referenceField));
      continue;
    }
    if (textReferenceBytes + targetFile.info.size > MAX_REFERENCE_TEXT_BYTES) {
      if (!textReferenceBudgetExceeded) {
        issues.push(makeIssue("references.text-budget", "Text reference scanning exceeds the 4 MiB aggregate limit.", "error", "references"));
        textReferenceBudgetExceeded = true;
      }
      continue;
    }
    textReferenceBytes += targetFile.info.size;

    let referenceText: string;
    try {
      const { bytes } = await readBoundedSkillFile(targetFile.realPath, [skillDirectory], MAX_SKILL_FILE_BYTES);
      referenceText = bytes.toString("utf-8");
    } catch {
      issues.push(makeIssue("reference.text-read", "A text reference could not be read within the safe scan bound.", "error", referenceField));
      continue;
    }
    if (countLines(referenceText) > 100 && !hasUsefulTableOfContents(referenceText)) {
      issues.push(makeIssue("reference.toc-recommended", "This text reference exceeds 100 lines and has no structured table of contents or link index.", "warning", referenceField));
    }
  }

  return makeReport(profile, issues, checkedPaths);
}

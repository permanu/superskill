// SPDX-License-Identifier: Apache-2.0

import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { moduleNodeId } from "./extractors/common.js";
import { resolveSpecifier, scanRepo, type FileIndex } from "./scan.js";
import { CodeGraphStore, edgeKey } from "./store.js";
import type { CodeEdge, CodeNode, Confidence, ScanResult } from "./types.js";

export type ClaimKind =
  | "file-exists"
  | "symbol-exists"
  | "symbol-exported"
  | "import-resolves"
  | "no-other-importers"
  | "no-other-callers";

export interface FileExistsClaim {
  kind: "file-exists";
  path: string;
}

export interface SymbolExistsClaim {
  kind: "symbol-exists";
  name: string;
  file?: string;
}

export interface SymbolExportedClaim {
  kind: "symbol-exported";
  name: string;
  file: string;
}

export interface ImportResolvesClaim {
  kind: "import-resolves";
  from: string;
  specifier: string;
}

export interface NoOtherImportersClaim {
  kind: "no-other-importers";
  file: string;
}

export interface NoOtherCallersClaim {
  kind: "no-other-callers";
  symbol: string;
  file?: string;
}

export type Claim =
  | FileExistsClaim
  | SymbolExistsClaim
  | SymbolExportedClaim
  | ImportResolvesClaim
  | NoOtherImportersClaim
  | NoOtherCallersClaim;

export type ClaimVerdict = "verified" | "refuted" | "unverifiable";

export interface ClaimEvidence {
  kind: "node" | "edge" | "file" | "scan";
  id?: string;
  confidence?: Confidence;
  detail?: string;
}

export interface ClaimResult {
  claim: Claim;
  verdict: ClaimVerdict;
  reason: string;
  evidence: ClaimEvidence[];
}

export interface ClaimsSummary {
  verified: number;
  refuted: number;
  unverifiable: number;
}

export interface ClaimsReport {
  root: string;
  summary: ClaimsSummary;
  claims: ClaimResult[];
}

export interface VerifyClaimsOptions {
  root?: string;
  scan?: ScanResult;
}

interface Verdict {
  verdict: ClaimVerdict;
  reason: string;
  evidence: ClaimEvidence[];
}

function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function normalizeSegments(path: string): string {
  const segments: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      const last = segments[segments.length - 1];
      if (last !== undefined && last !== "..") segments.pop();
      else segments.push("..");
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

export function claimPath(rootAbs: string, input: string): string {
  let clean = toPosix(input.trim());
  if (clean.startsWith("file:")) clean = clean.slice("file:".length);
  if (isAbsolute(clean)) clean = toPosix(relative(rootAbs, clean));
  return normalizeSegments(clean);
}

async function isFileOnDisk(rootAbs: string, rel: string): Promise<boolean> {
  const info = await stat(resolve(rootAbs, rel)).catch(() => null);
  return info?.isFile() ?? false;
}

function nodeEvidence(node: CodeNode, detail?: string): ClaimEvidence {
  return {
    kind: "node",
    id: node.id,
    confidence: "EXTRACTED",
    detail: detail ?? `${node.kind} ${node.name} @ ${node.file}:${node.span.startLine}`,
  };
}

function edgeEvidence(edge: CodeEdge, detail?: string): ClaimEvidence {
  return {
    kind: "edge",
    id: edgeKey(edge),
    confidence: edge.confidence,
    detail: detail ?? `${edge.from} -[${edge.kind}]-> ${edge.to}`,
  };
}

async function missingModule(rootAbs: string, rel: string, subject: string): Promise<Verdict> {
  if (await isFileOnDisk(rootAbs, rel)) {
    return {
      verdict: "unverifiable",
      reason: `${subject} exists on disk but is not in the graph scan (unsupported language or skipped)`,
      evidence: [{ kind: "file", detail: rel }],
    };
  }
  return {
    verdict: "refuted",
    reason: `${subject} is neither in the graph scan nor on disk`,
    evidence: [{ kind: "file", detail: rel }],
  };
}

function symbolNodes(store: CodeGraphStore, name: string, file?: string): CodeNode[] {
  return store.nodes().filter(
    (node) =>
      node.name === name &&
      node.kind !== "module" &&
      node.kind !== "import-source" &&
      (file === undefined || node.file === file),
  );
}

function buildFileIndex(store: CodeGraphStore): FileIndex {
  const files = new Set<string>();
  const byBasename = new Map<string, string[]>();
  for (const node of store.nodes()) {
    if (node.kind !== "module") continue;
    files.add(node.file);
    const base = node.file.split("/").pop() ?? node.file;
    const list = byBasename.get(base);
    if (list) list.push(node.file);
    else byBasename.set(base, [node.file]);
  }
  return { files, byBasename };
}

async function verifyFileExists(
  claim: FileExistsClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const rel = claimPath(rootAbs, claim.path);
  const module = store.getNode(moduleNodeId(rel));
  if (module) {
    return {
      claim,
      verdict: "verified",
      reason: `file ${rel} is present in the graph scan (EXTRACTED)`,
      evidence: [nodeEvidence(module, `module ${rel}`)],
    };
  }
  return { claim, ...(await missingModule(rootAbs, rel, `file ${rel}`)) };
}

async function verifySymbolExists(
  claim: SymbolExistsClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const file = claim.file ? claimPath(rootAbs, claim.file) : undefined;
  let module: CodeNode | undefined;
  if (file !== undefined) {
    module = store.getNode(moduleNodeId(file));
    if (!module) return { claim, ...(await missingModule(rootAbs, file, `file ${file}`)) };
  }
  const nodes = symbolNodes(store, claim.name, file);
  if (nodes.length > 0) {
    return {
      claim,
      verdict: "verified",
      reason: file
        ? `symbol "${claim.name}" is defined in ${file} (EXTRACTED)`
        : `symbol "${claim.name}" is defined in the graph scan (EXTRACTED)`,
      evidence: nodes.map((node) => nodeEvidence(node)),
    };
  }
  const where = file ? ` in ${file}` : "";
  return {
    claim,
    verdict: "refuted",
    reason: `no symbol named "${claim.name}"${where} in the graph scan (EXTRACTED)`,
    evidence: module
      ? [nodeEvidence(module, `module ${file}`)]
      : [{ kind: "scan", detail: `${store.nodeCount()} nodes scanned` }],
  };
}

async function verifySymbolExported(
  claim: SymbolExportedClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const file = claimPath(rootAbs, claim.file);
  const module = store.getNode(moduleNodeId(file));
  if (!module) return { claim, ...(await missingModule(rootAbs, file, `file ${file}`)) };

  const nodes = symbolNodes(store, claim.name, file);
  if (nodes.length === 0) {
    return {
      claim,
      verdict: "refuted",
      reason: `no symbol named "${claim.name}" in ${file} (EXTRACTED)`,
      evidence: [nodeEvidence(module, `module ${file}`)],
    };
  }

  const exportEdges = store
    .edges()
    .filter((edge) => edge.kind === "exports" && edge.from === module.id && edge.confidence === "EXTRACTED");
  const exported = nodes.filter(
    (node) => node.exported === true || exportEdges.some((edge) => edge.to === node.id),
  );
  if (exported.length === 0) {
    return {
      claim,
      verdict: "refuted",
      reason: `symbol "${claim.name}" exists in ${file} but has no EXTRACTED export marker`,
      evidence: nodes.map((node) => nodeEvidence(node)),
    };
  }

  return {
    claim,
    verdict: "verified",
    reason: `symbol "${claim.name}" is exported from ${file} (EXTRACTED)`,
    evidence: [
      ...exported.map((node) => nodeEvidence(node, `${node.kind} ${node.name} exported @ ${file}:${node.span.startLine}`)),
      ...exportEdges.filter((edge) => exported.some((node) => node.id === edge.to)).map((edge) => edgeEvidence(edge)),
    ],
  };
}

async function verifyImportResolves(
  claim: ImportResolvesClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const from = claimPath(rootAbs, claim.from);
  const module = store.getNode(moduleNodeId(from));
  if (!module) return { claim, ...(await missingModule(rootAbs, from, `file ${from}`)) };

  const statements = store
    .edges()
    .filter(
      (edge) =>
        edge.kind === "imports" &&
        edge.confidence === "EXTRACTED" &&
        edge.from === module.id &&
        store.getNode(edge.to)?.name === claim.specifier,
    );
  if (statements.length === 0) {
    return {
      claim,
      verdict: "refuted",
      reason: `no EXTRACTED import of "${claim.specifier}" in ${from}`,
      evidence: [nodeEvidence(module, `module ${from}`)],
    };
  }
  const statementEvidence = statements.map((edge) =>
    edgeEvidence(edge, `import statement "${claim.specifier}"`),
  );

  const index = buildFileIndex(store);
  const target =
    module.language === "external" ? null : resolveSpecifier(module.language, from, claim.specifier, index);
  if (!target || target === from) {
    return {
      claim,
      verdict: "unverifiable",
      reason: `import of "${claim.specifier}" is present (EXTRACTED) but did not resolve to another scanned file`,
      evidence: statementEvidence,
    };
  }

  const targetId = moduleNodeId(target);
  const extractedResolution = store
    .edges()
    .filter(
      (edge) =>
        edge.kind === "imports" &&
        edge.confidence === "EXTRACTED" &&
        edge.from === module.id &&
        edge.to === targetId,
    );
  if (extractedResolution.length > 0) {
    return {
      claim,
      verdict: "verified",
      reason: `import of "${claim.specifier}" in ${from} resolves to ${target} with an EXTRACTED edge`,
      evidence: [...statementEvidence, ...extractedResolution.map((edge) => edgeEvidence(edge))],
    };
  }

  const inferredResolution = store
    .edges()
    .filter(
      (edge) =>
        edge.kind === "imports" &&
        edge.confidence === "INFERRED" &&
        edge.from === module.id &&
        edge.to === targetId,
    );
  const evidence = [
    ...statementEvidence,
    ...inferredResolution.map((edge) => edgeEvidence(edge, `INFERRED resolution to ${target}`)),
  ];
  const targetNode = store.getNode(targetId);
  if (targetNode) evidence.push(nodeEvidence(targetNode, `resolved target ${target}`));

  return {
    claim,
    verdict: "unverifiable",
    reason: `"${claim.specifier}" resolves to ${target} only via INFERRED resolution; no EXTRACTED evidence of the resolution`,
    evidence,
  };
}

async function verifyNoOtherImporters(
  claim: NoOtherImportersClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const file = claimPath(rootAbs, claim.file);
  const module = store.getNode(moduleNodeId(file));
  if (!module) return { claim, ...(await missingModule(rootAbs, file, `file ${file}`)) };

  const incoming = store.edges().filter((edge) => edge.kind === "imports" && edge.to === module.id);
  if (incoming.length === 0) {
    return {
      claim,
      verdict: "verified",
      reason: `no imports edge targets ${file} in the graph scan (EXTRACTED scan)`,
      evidence: [nodeEvidence(module, `module ${file}`)],
    };
  }

  const extracted = incoming.filter((edge) => edge.confidence === "EXTRACTED");
  if (extracted.length > 0) {
    return {
      claim,
      verdict: "refuted",
      reason: `importer(s) of ${file} found with EXTRACTED edge(s)`,
      evidence: extracted.map((edge) => edgeEvidence(edge)),
    };
  }

  return {
    claim,
    verdict: "unverifiable",
    reason: `importer(s) of ${file} found only via INFERRED specifier resolution; no EXTRACTED evidence`,
    evidence: incoming.map((edge) => edgeEvidence(edge, `INFERRED importer ${edge.from}`)),
  };
}

async function verifyNoOtherCallers(
  claim: NoOtherCallersClaim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  const file = claim.file ? claimPath(rootAbs, claim.file) : undefined;
  let module: CodeNode | undefined;
  if (file !== undefined) {
    module = store.getNode(moduleNodeId(file));
    if (!module) return { claim, ...(await missingModule(rootAbs, file, `file ${file}`)) };
  }

  const nodes = symbolNodes(store, claim.symbol, file);
  if (nodes.length === 0) {
    const where = file ? ` in ${file}` : "";
    return {
      claim,
      verdict: "refuted",
      reason: `no symbol named "${claim.symbol}"${where} in the graph scan (EXTRACTED)`,
      evidence: module
        ? [nodeEvidence(module, `module ${file}`)]
        : [{ kind: "scan", detail: `${store.nodeCount()} nodes scanned` }],
    };
  }

  const ids = new Set(nodes.map((node) => node.id));
  const incoming = store.edges().filter((edge) => edge.kind === "calls" && ids.has(edge.to));
  if (incoming.length === 0) {
    return {
      claim,
      verdict: "verified",
      reason: `no calls edge targets "${claim.symbol}" in the graph scan (EXTRACTED scan)`,
      evidence: nodes.map((node) => nodeEvidence(node)),
    };
  }

  const extracted = incoming.filter((edge) => edge.confidence === "EXTRACTED");
  if (extracted.length > 0) {
    return {
      claim,
      verdict: "refuted",
      reason: `caller(s) of "${claim.symbol}" found with EXTRACTED edge(s)`,
      evidence: extracted.map((edge) => edgeEvidence(edge)),
    };
  }

  return {
    claim,
    verdict: "unverifiable",
    reason: `caller(s) of "${claim.symbol}" found only via INFERRED call edges; no EXTRACTED evidence`,
    evidence: incoming.map((edge) => edgeEvidence(edge, `INFERRED caller ${edge.from}`)),
  };
}

async function verifyClaim(
  claim: Claim,
  store: CodeGraphStore,
  rootAbs: string,
): Promise<ClaimResult> {
  switch (claim.kind) {
    case "file-exists":
      return verifyFileExists(claim, store, rootAbs);
    case "symbol-exists":
      return verifySymbolExists(claim, store, rootAbs);
    case "symbol-exported":
      return verifySymbolExported(claim, store, rootAbs);
    case "import-resolves":
      return verifyImportResolves(claim, store, rootAbs);
    case "no-other-importers":
      return verifyNoOtherImporters(claim, store, rootAbs);
    case "no-other-callers":
      return verifyNoOtherCallers(claim, store, rootAbs);
  }
}

function requireString(raw: Record<string, unknown>, field: string, kind: ClaimKind): string {
  const value = raw[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`claims: ${kind} requires a non-empty "${field}"`);
  }
  return value;
}

function optionalString(raw: Record<string, unknown>, field: string): string | undefined {
  const value = raw[field];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function parseClaim(input: unknown): Claim {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("claims: each claim must be an object");
  }
  const raw = input as Record<string, unknown>;
  switch (raw.kind) {
    case "file-exists":
      return { kind: "file-exists", path: requireString(raw, "path", "file-exists") };
    case "symbol-exists": {
      const file = optionalString(raw, "file");
      return {
        kind: "symbol-exists",
        name: requireString(raw, "name", "symbol-exists"),
        ...(file ? { file } : {}),
      };
    }
    case "symbol-exported":
      return {
        kind: "symbol-exported",
        name: requireString(raw, "name", "symbol-exported"),
        file: requireString(raw, "file", "symbol-exported"),
      };
    case "import-resolves":
      return {
        kind: "import-resolves",
        from: requireString(raw, "from", "import-resolves"),
        specifier: requireString(raw, "specifier", "import-resolves"),
      };
    case "no-other-importers":
      return { kind: "no-other-importers", file: requireString(raw, "file", "no-other-importers") };
    case "no-other-callers": {
      const file = optionalString(raw, "file");
      return {
        kind: "no-other-callers",
        symbol: requireString(raw, "symbol", "no-other-callers"),
        ...(file ? { file } : {}),
      };
    }
    default:
      throw new Error(`claims: unknown claim kind "${String(raw.kind)}"`);
  }
}

export function parseClaims(input: unknown): Claim[] {
  if (!Array.isArray(input)) throw new Error("claims: expected an array of claim objects");
  return input.map(parseClaim);
}

export async function verifyClaims(
  claims: Claim[],
  options: VerifyClaimsOptions = {},
): Promise<ClaimsReport> {
  const rootAbs = resolve(options.root ?? process.cwd());
  const scan = options.scan ?? (await scanRepo(rootAbs));
  const store = new CodeGraphStore(scan.graph);
  const results: ClaimResult[] = [];
  for (const claim of claims) {
    results.push(await verifyClaim(claim, store, rootAbs));
  }
  const summary: ClaimsSummary = { verified: 0, refuted: 0, unverifiable: 0 };
  for (const result of results) summary[result.verdict] += 1;
  return { root: rootAbs, summary, claims: results };
}

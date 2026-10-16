// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { readBoundedSkillFile } from "./catalog.js";
import { scanSkillDirectory } from "./skill-installer.js";
import { scanForPromptInjection } from "./security-scanner.js";
import { auditHasFailure } from "./security-gate.js";
import type { AuditResult } from "./graph/schema.js";
import type { ResolvedSkillSource } from "./skill-source.js";

export interface SkillTrust {
  allowed: boolean;
  origin: "catalog" | "native" | "cache";
  integrity: "bundled" | "unrecorded" | "manifest-matched" | "host-pinned" | "failed";
  prompt_scan: "heuristic-pass" | "blocked";
  attestation: "not-established";
  execution: "not-authorized";
  bundle_sha256?: string;
  reason?: string;
}

export async function inspectSkillTrust(source: ResolvedSkillSource, file: string, content: string, audits?: AuditResult): Promise<SkillTrust> {
  const scan = scanForPromptInjection(content);
  const trust: SkillTrust = { allowed: !scan.blocked, origin: source.source, integrity: source.source === "catalog" ? "bundled" : "unrecorded", prompt_scan: scan.blocked ? "blocked" : "heuristic-pass", attestation: "not-established", execution: "not-authorized" };
  if (scan.blocked || auditHasFailure(audits)) return { ...trust, allowed: false, reason: scan.reason ?? "Recorded audit failure" };
  if (source.source === "catalog") return trust;
  try {
    const requirePins = process.env.SUPERSKILL_REQUIRE_SKILL_PINS;
    if (requirePins !== undefined && requirePins !== "0" && requirePins !== "1") throw new Error("Invalid pin requirement");
    const actual = await scanSkillDirectory(source.baseDir, true);
    if (actual.blockedReason) return { ...trust, allowed: false, integrity: "failed", reason: "Skill bundle failed bounded integrity or content checks" };
    const key = relative(source.baseDir, file).split(sep).join("/");
    const selected = actual.files.find(entry => entry.path === key);
    const digest = (bytes: string): string => createHash("sha256").update(bytes).digest("hex");
    if (!selected || selected.sha256 !== digest(content)) return { ...trust, allowed: false, integrity: "failed", reason: "Skill content changed during inspection" };
    const bundleHash = digest(JSON.stringify(actual.files));
    trust.bundle_sha256 = bundleHash;
    let manifest: Record<string, unknown> | undefined;
    try {
      const { bytes } = await readBoundedSkillFile(join(source.baseDir, ".superskill-provenance.json"), [source.baseDir]);
      const parsed: unknown = JSON.parse(bytes.toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      manifest = parsed as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("Invalid provenance");
    }
    if (manifest) {
      if (manifest.bundleHashAlgorithm !== "sha256" || !Array.isArray(manifest.bundleFiles)) throw new Error("Invalid provenance");
      const declared = manifest.bundleFiles.map((entry: Record<string, unknown>) => ({ path: entry.path, sizeBytes: entry.sizeBytes, sha256: entry.sha256, kind: entry.kind }));
      declared.sort((left, right) => String(left.path) < String(right.path) ? -1 : String(left.path) > String(right.path) ? 1 : 0);
      if (JSON.stringify(declared) !== JSON.stringify(actual.files) || auditHasFailure(manifest.audits as AuditResult | undefined)) throw new Error("Bundle integrity mismatch");
      trust.integrity = "manifest-matched";
    }
    const configured: unknown = process.env.SUPERSKILL_SKILL_PINS === undefined ? {} : JSON.parse(process.env.SUPERSKILL_SKILL_PINS);
    if (!configured || typeof configured !== "object" || Array.isArray(configured)) throw new Error("Invalid host pin policy");
    const pins = configured as Record<string, unknown>;
    if (Object.values(pins).some(pin => typeof pin !== "string" || !/^[a-f0-9]{64}$/.test(pin))) throw new Error("Invalid host pin policy");
    const expected = Object.hasOwn(pins, source.id) ? pins[source.id] : undefined;
    if (expected !== undefined && expected !== bundleHash) throw new Error("Host pin mismatch");
    if (requirePins === "1" && expected === undefined) throw new Error("Host approval required");
    if (expected !== undefined) trust.integrity = "host-pinned";
    return trust;
  } catch {
    return { ...trust, allowed: false, integrity: "failed", reason: "Skill integrity or host pin policy refused this bundle" };
  }
}

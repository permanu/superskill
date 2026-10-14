// SPDX-License-Identifier: Apache-2.0

import type { AuditResult, AuditStatus } from "../graph/schema.js";

// HTML parsing is inherently fragile — skills.sh is a Next.js app and its markup
// may change without notice. These regex patterns target server-rendered content
// and should be validated against real pages when updating.

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function validComponent(value: string): boolean {
  return /^[A-Za-z0-9_.-]{1,128}$/.test(value) && value !== "." && value !== "..";
}

interface BoundedHtml {
  html: string;
  responseBytes: number;
}

async function fetchHtml(url: string): Promise<BoundedHtml | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("skills.sh fetch timed out"));
    }, FETCH_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([fetch(url, { signal: controller.signal }), timeout]);
    reader = response.body?.getReader();
    if (!response.ok) return null;
    const declaredSize = Number(response.headers.get("content-length"));
    if (declaredSize > MAX_RESPONSE_BYTES) throw new Error(`skills.sh response exceeds size limit (${MAX_RESPONSE_BYTES} bytes)`);
    if (!reader) return { html: "", responseBytes: 0 };
    const bytes = new Uint8Array(MAX_RESPONSE_BYTES);
    let size = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      if (value.byteLength > MAX_RESPONSE_BYTES - size) throw new Error(`skills.sh response exceeds size limit (${MAX_RESPONSE_BYTES} bytes)`);
      bytes.set(value, size);
      size += value.byteLength;
    }
    let html: string;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size));
    } catch {
      throw new Error("skills.sh response is not valid UTF-8");
    }
    return { html, responseBytes: size };
  } finally {
    clearTimeout(timer);
    controller.abort();
    if (reader) {
      void reader.cancel().catch((error: unknown) => console.error(`[skills-sh] failed to cancel response: ${error instanceof Error ? error.message : String(error)}`));
      reader.releaseLock();
    }
  }
}

export interface SkillPageData {
  name: string;
  owner: string;
  repo: string;
  skill: string;
  installs: number;
  stars: number;
  audits: AuditResult;
  skillMd: string;
  sourceUrl: string;
  sourceResponseBytes: number;
  sourceRef?: string;
}

export interface SearchQueryResult {
  id: string;
  name: string;
  owner: string;
  repo: string;
  installs: number;
  stars: number;
  description: string;
}

export function parseAuditStatus(text: string): AuditStatus {
  const t = text.toLowerCase().trim();
  if (t === "pass" || t === "passing" || t === "low risk") return "pass";
  if (t === "warn" || t === "warning" || t === "med risk" || t === "medium risk") return "warn";
  if (t === "fail" || t === "failing" || t === "critical" || t === "high risk") return "fail";
  return "unknown";
}

export function parseInstallCount(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (Number.isNaN(num)) return 0;
  if (text.toLowerCase().includes("k")) return Math.round(num * 1_000);
  if (text.toLowerCase().includes("m")) return Math.round(num * 1_000_000);
  if (text.toLowerCase().includes("b")) return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function extractWeeklyInstalls(html: string): number {
  const patterns = [
    /(\d[\d,.]*\s*(?:k|m|b)?)\s*weekly\s*installs/i,
    /weekly\s*installs[^<]*?(\d[\d,.]*\s*(?:k|m|b)?)/i,
    /installs[^<]*?(\d[\d,.]*\s*(?:k|m|b)?)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return parseInstallCount(match[1]);
  }
  return 0;
}

function extractGithubStars(html: string): number {
  const patterns = [
    /(\d[\d,.]*\s*(?:k|m)?)\s*(?:stars?|⭐)/i,
    /stars?[^<]*?(\d[\d,.]*\s*(?:k|m)?)/i,
    /github[^<]*?(\d[\d,.]*\s*(?:k|m)?)\s*stars?/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return parseInstallCount(match[1]);
  }
  return 0;
}

function attribute(attributes: string, name: string): string | undefined {
  return new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(attributes)?.[1];
}

function elements(html: string, matches: (tag: string, attributes: string) => boolean, maxBytes = 64 * 1024): Array<{ start: number; end: number; body: string }> | null {
  const found: Array<{ start: number; end: number; body: string }> = [];
  let matched = 0;
  const openings = /<(section|div|a|span|li|pre)\b([^>]*)>/gi;
  for (const match of html.matchAll(openings)) {
    if (!matches(match[1].toLowerCase(), match[2])) continue;
    if (++matched > 64) return null;
    const start = match.index! + match[0].length;
    const fragment = html.slice(start, start + maxBytes);
    const tags = new RegExp(`<(/?)${match[1]}\\b[^>]*>`, "gi");
    let depth = 1;
    let tag: RegExpExecArray | null;
    while ((tag = tags.exec(fragment)) !== null) {
      depth += tag[1] ? -1 : 1;
      if (depth === 0) {
        found.push({ start: match.index!, end: start + tags.lastIndex, body: fragment.slice(0, tag.index) });
        break;
      }
    }
    if (depth !== 0) return null;
  }
  return found;
}

function elementBodies(html: string, matches: (tag: string, attributes: string) => boolean): string[] {
  return (elements(html, matches) ?? []).map((element) => element.body);
}

function withoutSkillContent(html: string): string | null {
  const content = elements(html, (_tag, attrs) => {
    const classes = (attribute(attrs, "class") ?? "").split(/\s+/);
    return attribute(attrs, "id") === "skill-md" || classes.some((name) => ["prose", "skill-content", "skill-md"].includes(name));
  }, MAX_RESPONSE_BYTES);
  if (content === null) return null;
  let result = "";
  let offset = 0;
  for (const region of content) {
    if (region.start < offset) continue;
    result += html.slice(offset, region.start);
    offset = region.end;
  }
  return result + html.slice(offset);
}

function cardStatus(body: string): AuditStatus {
  const values = body.replace(/<[^>]*>/g, "\n").split("\n").map(parseAuditStatus).filter((status) => status !== "unknown");
  if (values.includes("fail")) return "fail";
  return values.length > 0 && values.every((value) => value === values[0]) ? values[0] : "unknown";
}

function extractAuditFromHtml(html: string, provider: string, path: string): AuditStatus {
  const cards: string[] = [];
  const sections = elementBodies(html, (_tag, attrs) => {
    const label = attribute(attrs, "id") ?? attribute(attrs, "data-testid") ?? attribute(attrs, "aria-label");
    return label !== undefined && /^(?:security[- ]audits|skill-audits|audits)$/i.test(label);
  });
  sections.push(...elementBodies(html, (_tag, attrs) => (attribute(attrs, "class") ?? "").split(/\s+/).includes("bg-background"))
    .filter((body) => /^\s*<(?:div|h[1-6])\b[^>]*>\s*Security Audits\s*<\/(?:div|h[1-6])>/i.test(body)));
  for (const section of sections) {
    cards.push(...elementBodies(section, (tag, attrs) => {
      const href = attribute(attrs, "href");
      if (tag === "a" && (href === `${path}/security/${provider}` || (provider === "gen" && href === `${path}/security/agent-trust-hub`))) return true;
      if (attribute(attrs, "data-provider") === provider) return true;
      const classes = (attribute(attrs, "class") ?? "").split(/\s+/);
      return classes.includes(provider) && classes.some((value) => ["badge", "status", "label"].includes(value));
    }));
  }
  const statuses = cards.map(cardStatus);
  if (statuses.includes("fail")) return "fail";
  return statuses.length > 0 && statuses.every((value) => value === statuses[0]) ? statuses[0] : "unknown";
}

function structuredSkillPage(html: string, owner: string, repo: string, skill: string): Record<string, unknown> | undefined {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attribute(script[1], "id") !== "__NEXT_DATA__" || attribute(script[1], "type") !== "application/json") continue;
    try {
      const data = JSON.parse(script[2])?.props?.pageProps?.skill;
      if (data && data.owner === owner && data.repo === repo && data.skill === skill && typeof data === "object") return data as Record<string, unknown>;
    } catch (error) {
      console.error(`[skills-sh] malformed structured skill data: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }
  return undefined;
}

function extractSourceRef(data: Record<string, unknown> | undefined): string | undefined {
  const source = data?.source && typeof data.source === "object" ? data.source as Record<string, unknown> : undefined;
  const ref = data?.sourceRef ?? data?.source_ref ?? source?.ref;
  return typeof ref === "string" && ref.length <= 256 && !/[\x00-\x1f\x7f]/.test(ref) ? ref : undefined;
}

function extractAudits(html: string, owner: string, repo: string, skill: string): AuditResult {
  const data = structuredSkillPage(html, owner, repo, skill);
  if (data && Object.hasOwn(data, "audits")) {
    const audits = data.audits && typeof data.audits === "object" ? data.audits as Record<string, unknown> : {};
    const status = (value: unknown): AuditStatus => typeof value === "string" ? parseAuditStatus(value) : "unknown";
    return { gen: status(audits.gen), socket: status(audits.socket), snyk: status(audits.snyk) };
  }
  const rendered = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const auditHtml = withoutSkillContent(rendered) ?? "";
  const path = `/${owner}/${repo}/${skill}`;
  return {
    gen: extractAuditFromHtml(auditHtml, "gen", path),
    socket: extractAuditFromHtml(auditHtml, "socket", path),
    snyk: extractAuditFromHtml(auditHtml, "snyk", path),
  };
}

function extractSkillMd(html: string): string {
  // Pattern 1: skills.sh renders SKILL.md content in a prose div after the label
  const proseMatch = html.match(
    /<span>SKILL\.md<\/span><\/div><div[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  );
  if (proseMatch?.[1]) {
    return proseMatch[1]
      .replace(/<\/?(?:span|div|pre|code)[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
  }

  // Pattern 2: Look for h1 after SKILL.md label — content follows
  const skillLabelIdx = html.indexOf('>SKILL.md<');
  if (skillLabelIdx > -1) {
    const afterLabel = html.slice(skillLabelIdx);
    const h1Match = afterLabel.match(/<h1>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
    if (h1Match?.[1]) {
      return h1Match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
    }
  }

  // Pattern 3: Generic skill-content section
  const patterns = [
    /<section[^>]*class="[^"]*skill-content[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*id="skill-md"[^>]*>([\s\S]*?)<\/div>/i,
    /<pre[^>]*class="[^"]*skill-md[^"]*"[^>]*>([\s\S]*?)<\/pre>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
    }
  }
  return "";
}

export interface PublisherSkill {
  owner: string;
  repo: string;
  skill: string;
  url: string;
}

export async function fetchPublisherSkills(
  owner: string,
  repo?: string,
): Promise<PublisherSkill[]> {
  if (!validComponent(owner) || (repo !== undefined && !validComponent(repo))) return [];
  const path = repo ? `/${owner}/${repo}` : `/${owner}`;
  const url = `https://skills.sh${path}`;
  try {
    const response = await fetchHtml(url);
    if (response === null) return [];
    return extractPublisherSkills(response.html, owner, repo);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] fetchPublisherSkills failed for ${url}: ${msg}`);
    throw err;
  }
}

function extractPublisherSkills(
  html: string,
  owner: string,
  repoFilter?: string,
): PublisherSkill[] {
  const skills: PublisherSkill[] = [];
  const seen = new Set<string>();

  // Match skill links: /owner/repo/skill-name
  const pattern = /href="\/([^/]+)\/([^/]+)\/([^"/]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const [, o, r, skill] = match;
    if (![o, r, skill].every(validComponent)) continue;
    if (["docs", "official", "audits", "search", "trending", "hot", "picks", "internal", "debug-security", "site", "api", "package", "s", ".well-known"].includes(o)) continue;
    if (o !== owner) continue;
    if (repoFilter && r !== repoFilter) continue;
    if (skill === "security" || skill.startsWith("security/")) continue;
    const key = `${o}/${r}/${skill}`;
    if (seen.has(key)) continue;
    seen.add(key);
    skills.push({ owner: o, repo: r, skill, url: `https://skills.sh/${key}` });
  }

  return skills;
}

export async function fetchSkillPage(
  owner: string,
  repo: string,
  skill: string,
): Promise<SkillPageData | null> {
  if (![owner, repo, skill].every(validComponent)) return null;
  const url = `https://skills.sh/${owner}/${repo}/${skill}`;
  try {
    const response = await fetchHtml(url);
    if (response === null) return null;
    const html = response.html;
    const structured = structuredSkillPage(html, owner, repo, skill);
    const sourceRef = extractSourceRef(structured);
    return {
      name: skill,
      owner,
      repo,
      skill,
      installs: extractWeeklyInstalls(html),
      stars: extractGithubStars(html),
      audits: extractAudits(html, owner, repo, skill),
      skillMd: extractSkillMd(html),
      sourceUrl: url,
      sourceResponseBytes: response.responseBytes,
      ...(sourceRef ? { sourceRef } : {}),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] fetchSkillPage failed for ${url}: ${msg}`);
    return null;
  }
}

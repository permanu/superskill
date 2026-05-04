// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AuditResult, AuditStatus } from "../graph/schema.js";

// HTML parsing is inherently fragile — skills.sh is a Next.js app and its markup
// may change without notice. These regex patterns target server-rendered content
// and should be validated against real pages when updating.

const FETCH_TIMEOUT_MS = 10_000;

export interface SkillPageData {
  name: string;
  owner: string;
  repo: string;
  skill: string;
  installs: number;
  stars: number;
  audits: AuditResult;
  skillMd: string;
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

function extractAuditFromHtml(html: string, provider: string): AuditStatus {
  // Match: ProviderName</span>...bg-green/amber/red...>Pass/Warn/Fail<
  const colorPattern = new RegExp(
    `${provider}.*?bg-(?:green|amber|red)-500[^>]*>(Pass|Fail|Warn)<`,
    "is",
  );
  const colorMatch = html.match(colorPattern);
  if (colorMatch?.[1]) return parseAuditStatus(colorMatch[1].trim());

  // Fallback: match provider name followed by badge text
  const pattern = new RegExp(
    `${provider}[^>]*(?:badge|label|status|class)[^>]*>([^<]+)`,
    "i",
  );
  const match = html.match(pattern);
  if (!match?.[1]) return "unknown";
  return parseAuditStatus(match[1].trim());
}

function extractAudits(html: string): AuditResult {
  return {
    gen: extractAuditFromHtml(html, "gen"),
    socket: extractAuditFromHtml(html, "socket"),
    snyk: extractAuditFromHtml(html, "snyk"),
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
  const path = repo ? `/${owner}/${repo}` : `/${owner}`;
  const url = `https://skills.sh${path}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return [];
    const html = await response.text();
    return extractPublisherSkills(html, owner, repo);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] fetchPublisherSkills failed for ${url}: ${msg}`);
    return [];
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
  const url = `https://skills.sh/${owner}/${repo}/${skill}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const html = await response.text();
    return {
      name: skill,
      owner,
      repo,
      skill,
      installs: extractWeeklyInstalls(html),
      stars: extractGithubStars(html),
      audits: extractAudits(html),
      skillMd: extractSkillMd(html),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[skills-sh] fetchSkillPage failed for ${url}: ${msg}`);
    return null;
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AuditResult, AuditStatus } from "../graph/schema.js";

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
  const patterns = [
    /<section[^>]*class="[^"]*skill-content[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
    /<div[^>]*id="skill-md"[^>]*>([\s\S]*?)<\/div>/i,
    /<pre[^>]*class="[^"]*skill-md[^"]*"[^>]*>([\s\S]*?)<\/pre>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
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

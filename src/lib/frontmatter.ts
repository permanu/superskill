// SPDX-License-Identifier: AGPL-3.0-or-later
import matter from "gray-matter";

export interface Frontmatter {
  type?: string;
  project?: string;
  status?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  related?: string[];
  [key: string]: unknown;
}

const KNOWN_TYPES = [
  "context", "adr", "brainstorm", "decision", "todo",
  "incident", "pattern", "evaluation", "index",
  "task", "learning", "session",
  "prd", "vision", "strategy", "roadmap", "rfc",
  "research", "spec", "competitive-analysis",
];

const VALID_STATUSES = [
  "active", "resolved", "deprecated", "draft", "published",
  "backlog", "in-progress", "blocked", "done", "cancelled", "completed",
];

/**
 * Parse markdown content with YAML frontmatter.
 */
export function parseFrontmatter(content: string): { data: Frontmatter; content: string } {
  try {
    const parsed = matter(content);
    return { data: parsed.data as Frontmatter, content: parsed.content };
  } catch {
    // Malformed YAML — return empty frontmatter and raw content
    return { data: {}, content };
  }
}

/**
 * Serialize frontmatter + content back to markdown.
 */
export function serializeFrontmatter(data: Frontmatter, content: string): string {
  return matter.stringify(content, data);
}

/**
 * Create frontmatter with defaults for a new note.
 */
export function createFrontmatter(overrides: Partial<Frontmatter>): Frontmatter {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: overrides.type ?? "index",
    status: overrides.status ?? "active",
    created: overrides.created ?? today,
    updated: today,
    ...overrides,
  };
}

/**
 * Merge new frontmatter values into existing frontmatter.
 * Updates the `updated` field automatically.
 */
export function mergeFrontmatter(existing: Frontmatter, updates: Partial<Frontmatter>): Frontmatter {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...existing,
    ...updates,
    updated: today,
  };
}

/**
 * Validate frontmatter fields.
 */
export function validateFrontmatter(data: Frontmatter): string[] {
  const errors: string[] = [];

  if (data.type && !/^[a-z][a-z0-9-]*$/.test(data.type)) {
    errors.push(`Invalid type "${data.type}". Must be a lowercase slug (e.g. prd, vision, competitive-analysis)`);
  }

  if (data.status && !VALID_STATUSES.includes(data.status)) {
    errors.push(`Invalid status "${data.status}". Must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push(`Tags must be an array`);
  }

  if (data.related && !Array.isArray(data.related)) {
    errors.push(`Related must be an array`);
  }

  return errors;
}

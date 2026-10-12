// SPDX-License-Identifier: Apache-2.0
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname } from "path";
import {
  INSTRUCTION_TEXT,
  PREVIOUS_INSTRUCTION_TEXT,
  PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT,
  MARKER_BEGIN_HTML,
  MARKER_START_HTML,
  MARKER_END_HTML,
  type InstructionStatus,
} from "./types.js";

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const MARKED_BLOCK = `${MARKER_BEGIN_HTML}\n${INSTRUCTION_TEXT}\n${MARKER_END_HTML}`;
const KNOWN_PREVIOUS = [PREVIOUS_INSTRUCTION_TEXT, PREVIOUS_LIFECYCLE_INSTRUCTION_TEXT];
const MDC_FRONTMATTER = `---\ndescription: SuperSkill knowledge base integration\nalwaysApply: true\n---`;
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---[^\S\n]*\n?/;

interface InstructionPlan {
  status: InstructionStatus;
  content: string | null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function managedBlockRegex(): RegExp {
  return new RegExp(
    `(${escapeRegex(MARKER_BEGIN_HTML)}|${escapeRegex(MARKER_START_HTML)})([\\s\\S]*?)${escapeRegex(MARKER_END_HTML)}`,
    "g"
  );
}

export function hasManagedInstructionBlock(content: string): boolean {
  return managedBlockRegex().test(content);
}

function removeMarkedBlock(content: string): string {
  return content
    .replace(managedBlockRegex(), "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd() + "\n";
}

function appendBlock(existing: string): string {
  return `${existing.trimEnd()}\n\n${MARKED_BLOCK}\n`;
}

function replaceKnownBlock(existing: string, content: string, force: boolean): InstructionPlan {
  const blocks = [...content.matchAll(managedBlockRegex())];
  if (blocks.length === 0) return { status: "appended", content: appendBlock(content) };
  if (force) {
    return { status: "appended", content: appendBlock(removeMarkedBlock(content)) };
  }
  if (blocks.length !== 1) return { status: "exists", content: null };
  const inner = blocks[0][2].trim();
  if (inner === INSTRUCTION_TEXT || !KNOWN_PREVIOUS.includes(inner)) {
    return { status: "exists", content: null };
  }
  const block = blocks[0];
  return {
    status: "appended",
    content: existing.slice(0, block.index) + MARKED_BLOCK + existing.slice(block.index! + block[0].length),
  };
}

function hasOrphanMarker(content: string): boolean {
  return content.includes(MARKER_BEGIN_HTML) || content.includes(MARKER_START_HTML) || content.includes(MARKER_END_HTML);
}

function markdownPlan(filePath: string, force: boolean): InstructionPlan {
  if (!existsSync(filePath)) {
    return { status: "created", content: MARKED_BLOCK + "\n" };
  }
  const existing = readFileSync(filePath, "utf-8");
  if (hasManagedInstructionBlock(existing)) {
    return replaceKnownBlock(existing, existing, force);
  }
  if (hasOrphanMarker(existing) && !force) {
    return { status: "exists", content: null };
  }
  if (force) {
    return { status: "appended", content: appendBlock(removeMarkedBlock(existing)) };
  }
  const unmarked = existing.trim();
  if (unmarked === INSTRUCTION_TEXT || KNOWN_PREVIOUS.includes(unmarked)) {
    return { status: "appended", content: MARKED_BLOCK + "\n" };
  }
  return { status: "appended", content: appendBlock(existing) };
}

export function planMarkdownInstruction(filePath: string, force = false): InstructionStatus {
  return markdownPlan(filePath, force).status;
}

export function writeMarkdownInstruction(
  filePath: string,
  force = false
): InstructionStatus {
  const plan = markdownPlan(filePath, force);
  if (plan.content !== null) {
    ensureDir(filePath);
    writeFileSync(filePath, plan.content, "utf-8");
  }
  return plan.status;
}

export function removeMarkdownInstruction(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");
  if (!hasManagedInstructionBlock(content)) return false;

  writeFileSync(filePath, removeMarkedBlock(content), "utf-8");
  return true;
}

function mdcPlan(filePath: string, force: boolean): InstructionPlan {
  if (!existsSync(filePath)) {
    return { status: "created", content: `${MDC_FRONTMATTER}\n\n${MARKED_BLOCK}\n` };
  }
  const existing = readFileSync(filePath, "utf-8");
  if (hasManagedInstructionBlock(existing)) {
    return replaceKnownBlock(existing, existing, force);
  }
  if (hasOrphanMarker(existing) && !force) {
    return { status: "exists", content: null };
  }
  const framing = existing.match(FRONTMATTER_RE);
  const body = (framing ? existing.slice(framing[0].length) : existing).trim();
  if (body === "" || body === INSTRUCTION_TEXT || KNOWN_PREVIOUS.includes(body)) {
    const framingText = (framing ? framing[0] : `${MDC_FRONTMATTER}\n`).replace(/\s+$/, "");
    return { status: "appended", content: `${framingText}\n\n${MARKED_BLOCK}\n` };
  }
  return { status: "appended", content: appendBlock(existing) };
}

export function planMdcInstruction(filePath: string, force = false): InstructionStatus {
  return mdcPlan(filePath, force).status;
}

export function writeMdcInstruction(filePath: string, force = false): InstructionStatus {
  const plan = mdcPlan(filePath, force);
  if (plan.content !== null) {
    ensureDir(filePath);
    writeFileSync(filePath, plan.content, "utf-8");
  }
  return plan.status;
}

export function removeMdcInstruction(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

// SPDX-License-Identifier: AGPL-3.0-or-later

const TEMPLATES: Record<string, { frontmatter: Record<string, unknown>; body: string }> = {
  adr: {
    frontmatter: { type: "adr", status: "draft" },
    body: `# {{title}}

## Context

{{context}}

## Decision

{{decision}}

## Alternatives Considered

{{alternatives}}

## Consequences

{{consequences}}
`,
  },
  prd: {
    frontmatter: { type: "prd", status: "draft" },
    body: `# {{title}}

## Problem Statement

{{problem}}

## Goals

{{goals}}

## Non-Goals

{{non-goals}}

## Proposed Solution

{{solution}}

## Success Metrics

{{metrics}}

## Open Questions

{{questions}}
`,
  },
  decision: {
    frontmatter: { type: "decision", status: "active" },
    body: `# {{title}}

## Context

{{context}}

## Decision

{{decision}}

## Alternatives

{{alternatives}}

## Consequences

{{consequences}}
`,
  },
  learning: {
    frontmatter: { type: "learning", confidence: "medium" },
    body: `# {{title}}

## Discovery

{{discovery}}

## Implications

{{implications}}

## Confidence

{{confidence}}
`,
  },
  spec: {
    frontmatter: { type: "spec", status: "draft" },
    body: `# {{title}}

## Overview

{{overview}}

## Requirements

{{requirements}}

## API / Interface

{{api}}

## Edge Cases

{{edge-cases}}

## Testing Strategy

{{testing}}
`,
  },
  rfc: {
    frontmatter: { type: "rfc", status: "draft" },
    body: `# {{title}}

## Summary

{{summary}}

## Motivation

{{motivation}}

## Detailed Design

{{design}}

## Drawbacks

{{drawbacks}}

## Alternatives

{{alternatives}}

## Unresolved Questions

{{questions}}
`,
  },
  roadmap: {
    frontmatter: { type: "roadmap", status: "draft" },
    body: `# {{title}}

## Vision

{{vision}}

## Milestones

{{milestones}}

## Dependencies

{{dependencies}}

## Timeline

{{timeline}}
`,
  },
  competitive: {
    frontmatter: { type: "competitive-analysis", status: "draft" },
    body: `# {{title}}

## Competitors

{{competitors}}

## Feature Comparison

{{comparison}}

## Differentiators

{{differentiators}}

## Strategic Implications

{{implications}}
`,
  },
  incident: {
    frontmatter: { type: "incident", status: "active" },
    body: `# {{title}}

## Timeline

{{timeline}}

## Root Cause

{{root-cause}}

## Impact

{{impact}}

## Resolution

{{resolution}}

## Action Items

{{action-items}}
`,
  },
  research: {
    frontmatter: { type: "research", status: "draft" },
    body: `# {{title}}

## Research Question

{{question}}

## Findings

{{findings}}

## Data / Evidence

{{evidence}}

## Conclusion

{{conclusion}}
`,
  },
  vision: {
    frontmatter: { type: "vision", status: "draft" },
    body: `# {{title}}

## North Star

{{north-star}}

## Principles

{{principles}}

## Key Bets

{{bets}}

## Success Criteria

{{success-criteria}}
`,
  },
  strategy: {
    frontmatter: { type: "strategy", status: "draft" },
    body: `# {{title}}

## Current State

{{current-state}}

## Target State

{{target-state}}

## Strategic Themes

{{themes}}

## Investment Areas

{{investment}}

## Risks

{{risks}}
`,
  },
};

export function getTemplate(type: string): { frontmatter: Record<string, unknown>; body: string } | null {
  const normalized = type.toLowerCase().replace(/[^a-z0-9]/g, "-");
  if (TEMPLATES[normalized]) return TEMPLATES[normalized];
  if (TEMPLATES[type]) return TEMPLATES[type];
  return null;
}

export function listTemplates(): string[] {
  return Object.keys(TEMPLATES);
}

export function applyTemplate(
  type: string,
  variables: Record<string, string>,
): { frontmatter: Record<string, unknown>; body: string } | null {
  const template = getTemplate(type);
  if (!template) return null;

  let body = template.body;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return { frontmatter: { ...template.frontmatter }, body };
}

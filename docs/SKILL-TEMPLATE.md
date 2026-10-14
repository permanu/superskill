---
name: review-api-boundaries
description: Reviews API designs for resource naming, status codes, pagination, filtering, and error behavior. This skill is for tasks that design or review a REST API or API endpoint.
---

# Review API boundaries

Brief overview of the methodology or approach.

## When to Use

- Scenario 1
- Scenario 2

## Steps

1. First step
2. Second step
3. Third step

## Examples

### Example: [Concrete scenario]

[Show how the skill applies to a real task]

## Key Principles

- Principle 1
- Principle 2

This is a native skill template: `name` must be lowercase letters, numbers, and hyphens, at most 64 characters, with no XML tags or reserved `claude` / `anthropic` terms. `description` must be non-empty, at most 1,024 characters, contain no XML tags, and explain both what the skill does and when to use it in third person. See [Anthropic's skill-authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

Validate the containing directory or its `SKILL.md` with `superskill skill validate <path> --profile anthropic` or `--profile portable`. These profiles validate format and bundle constraints, not behavior quality or runtime compatibility. In-repo packs and atomic rules use separate internal identifiers and contracts; they do not have to satisfy native skill frontmatter requirements.

A portable profile is not an offline guarantee: skills that require Node, MCP tools, packages, or network services depend on the host. Anthropic notes that Claude API code execution has no network access or runtime package installation.

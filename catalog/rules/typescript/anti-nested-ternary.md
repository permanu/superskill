---
id: typescript-anti-nested-ternary
lang: typescript
prefix: anti
title: Do not nest ternary expressions
severity: prefer
enforce: tool
tool: "eslint:no-nested-ternary"
baseline: latest
status: verified
triggers:
  keywords: [nested ternary, conditional expression, readability]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-style-no-else-return]
sources:
  - title: ESLint - no-nested-ternary
    url: https://eslint.org/docs/latest/rules/no-nested-ternary/
---
> Use an if/else chain instead of nesting one ternary inside another.

## Why

Nested ternaries group right-associatively, so the reader has to reconstruct which condition owns which branch before knowing what the expression returns. Sequential branches state the same logic top to bottom, one condition per line.

## Bad

```typescript
export function label(score: number): string {
  return score > 90 ? "high" : score > 50 ? "medium" : "low";
}
```

## Good

```typescript
export function label(score: number): string {
  if (score > 90) {
    return "high";
  }
  if (score > 50) {
    return "medium";
  }
  return "low";
}
```

## See Also

- [typescript-style-no-else-return](style-no-else-return.md) - keeping branch chains flat after an early return

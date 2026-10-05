---
id: typescript-style-no-else-return
lang: typescript
prefix: style
title: Drop else after a branch that returns
severity: prefer
enforce: tool
tool: "eslint:no-else-return"
baseline: latest
status: verified
triggers:
  keywords: [else after return, early return, nesting]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [return]
related: [typescript-anti-nested-ternary]
sources:
  - title: ESLint - no-else-return
    url: https://eslint.org/docs/latest/rules/no-else-return/
---
> After an `if` branch returns, continue at the function level instead of nesting the rest in `else`.

## Why

An `else` block after a `return` is redundant nesting: the branch already ended the function, so the `else` guards nothing. Flat continuation keeps the main path at the left margin and saves the indentation for nesting that actually means something.

## Bad

```typescript
export function label(value: string): string {
  if (value === "") {
    return "empty";
  } else {
    return value;
  }
}
```

## Good

```typescript
export function label(value: string): string {
  if (value === "") {
    return "empty";
  }
  return value;
}
```

## See Also

- [typescript-anti-nested-ternary](anti-nested-ternary.md) - the expression form of the same branch-flattening rule

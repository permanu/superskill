---
id: typescript-style-curly-braces
lang: typescript
prefix: style
title: Brace every control statement body
severity: should
enforce: tool
tool: "eslint:curly"
baseline: latest
status: verified
triggers:
  keywords: [braces, control statement, block]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-style-no-else-return]
sources:
  - title: ESLint - curly
    url: https://eslint.org/docs/latest/rules/curly/
---
> Wrap the body of every `if`, `for`, and `while` in braces, even for one statement.

## Why

A braceless body makes the statement's extent invisible, so a later edit that adds a second line silently moves it outside the condition. Braces keep the boundary explicit at no reading cost and make the block structure uniform across the file.

## Bad

```typescript
export function clamp(value: number): number {
  if (value < 0) return 0;
  return value;
}
```

## Good

```typescript
export function clamp(value: number): number {
  if (value < 0) {
    return 0;
  }
  return value;
}
```

## See Also

- [typescript-style-no-else-return](style-no-else-return.md) - the other rule that keeps control flow flat and explicit

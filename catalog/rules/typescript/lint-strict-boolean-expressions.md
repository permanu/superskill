---
id: typescript-lint-strict-boolean-expressions
lang: typescript
prefix: lint
title: Compare nullable and numeric values explicitly in conditions
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/strict-boolean-expressions"
baseline: latest
status: verified
triggers:
  keywords: [truthiness, boolean expression, strict-boolean]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [if]
related: [typescript-lint-no-unnecessary-condition, typescript-lint-prefer-nullish-coalescing]
sources:
  - title: typescript-eslint - strict-boolean-expressions
    url: https://typescript-eslint.io/rules/strict-boolean-expressions/
---
> Write the comparison a condition means, such as `!== undefined` or `!== 0`, instead of relying on truthiness.

## Why

Truthiness folds empty strings, zero, and nullish values into one branch, so `if (count)` treats a legitimate `0` as absent and `if (name)` rejects an empty-but-valid string. Spelling out the comparison keeps nullish and falsy cases separate and makes the intended condition visible.

## Bad

```typescript
export function greet(name: string | undefined): string {
  if (name) {
    return `Hello, ${name}`;
  }
  return "Hello";
}
```

## Good

```typescript
export function greet(name: string | undefined): string {
  if (name !== undefined && name !== "") {
    return `Hello, ${name}`;
  }
  return "Hello";
}
```

## See Also

- [typescript-lint-no-unnecessary-condition](lint-no-unnecessary-condition.md) - removing checks the types prove pointless
- [typescript-lint-prefer-nullish-coalescing](lint-prefer-nullish-coalescing.md) - the same distinction in fallback expressions

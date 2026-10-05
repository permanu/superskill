---
id: typescript-lint-no-inferrable-types
lang: typescript
prefix: lint
title: Drop annotations the initializer already provides
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/no-inferrable-types"
baseline: latest
status: verified
triggers:
  keywords: [inferrable type, redundant annotation, literal]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [const]
related: [typescript-api-explicit-return-types, typescript-lint-no-unused-vars]
sources:
  - title: typescript-eslint - no-inferrable-types
    url: https://typescript-eslint.io/rules/no-inferrable-types/
---
> Let a literal initializer determine the type instead of repeating `: number` or `: string`.

## Why

An annotation that repeats the initializer's type adds noise, and on a literal it can widen the inferred literal type to the general primitive. The initializer is the single source of truth for a local's type; annotations belong on boundaries the initializer cannot describe.

## Bad

```typescript
export function count(): number {
  const total: number = 0;
  return total;
}
```

## Good

```typescript
export function count(): number {
  const total = 0;
  return total;
}
```

## See Also

- [typescript-api-explicit-return-types](api-explicit-return-types.md) - where annotations do carry information
- [typescript-lint-no-unused-vars](lint-no-unused-vars.md) - removing the other kind of redundant declaration

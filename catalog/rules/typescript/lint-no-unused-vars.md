---
id: typescript-lint-no-unused-vars
lang: typescript
prefix: lint
title: Delete bindings the code never reads
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unused-vars"
baseline: latest
status: verified
triggers:
  keywords: [unused variable, dead code, no-unused-vars]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [const, let]
related: [typescript-api-minimal-surface]
sources:
  - title: typescript-eslint - no-unused-vars
    url: https://typescript-eslint.io/rules/no-unused-vars/
---
> Remove variables, parameters, and imports that nothing reads so dead code cannot hide a missing call.

## Why

An unused binding is either a forgotten call or a dropped computation, and leaving it makes the omission invisible to reviewers and to the compiler's unused checks. Deleting it keeps the file's text aligned with the behavior it actually performs.

## Bad

```typescript
export function total(values: number[]): number {
  const count = values.length;
  return values.reduce((sum, value) => sum + value, 0);
}
```

## Good

```typescript
export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
```

## See Also

- [typescript-api-minimal-surface](api-minimal-surface.md) - the export-level version of removing what nothing uses

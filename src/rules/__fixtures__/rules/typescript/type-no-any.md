---
id: typescript-type-no-any
lang: typescript
prefix: type
title: Model unknown data with unknown instead of any
severity: should
enforce: tool
tool: eslint:@typescript-eslint/no-explicit-any
baseline: TypeScript 5.9 / Node 26
status: verified
triggers:
  keywords: [type, any, interface]
  files: ["**/*.tsx"]
sources:
  - title: TypeScript Handbook - Everyday Types
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Replace any with unknown at the edges and narrow before use.

## Why

any disables checking and spreads silently through every call site. unknown keeps the value opaque until a guard proves its shape.

## Bad

```typescript
function first(items: any[]): any {
  return items[0];
}
```

## Good

```typescript
function first(items: unknown[]): unknown {
  return items[0];
}
```

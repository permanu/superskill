---
id: typescript-api-minimal-surface
lang: typescript
prefix: api
title: Export only the symbols consumers need
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [export, API surface, internal, module]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [export]
related: [typescript-api-named-exports, typescript-api-explicit-return-types]
sources:
  - title: Google TypeScript Style Guide (export visibility)
    url: https://google.github.io/styleguide/tsguide.html
---
> Export only the symbols consumers need; keep internal types and helpers module-private.

## Why

Every export is a compatibility promise that other modules can import, so an internal helper that leaks becomes something the team cannot change without a search across the codebase. Keeping the surface small makes the intended API obvious and leaves the implementation free to move.

## Bad

```typescript
export interface InternalCache {
  get(key: string): string | undefined;
}

export function cacheKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}
```

## Good

```typescript
interface InternalCache {
  get(key: string): string | undefined;
}

export function cacheKey(prefix: string, id: string): string {
  return `${prefix}:${id}`;
}
```

## See Also

- [typescript-api-named-exports](api-named-exports.md) - the naming half of a clean surface
- [typescript-api-explicit-return-types](api-explicit-return-types.md) - typing the surface that remains

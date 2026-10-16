---
id: typescript-doc-fileoverview
lang: typescript
prefix: doc
title: Add a file overview only for non-obvious module constraints
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["@fileoverview", module summary, overview]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-public, typescript-api-modules-over-namespaces]
sources:
  - title: Google TypeScript Style Guide - @fileoverview JSDoc
    url: https://google.github.io/styleguide/tsguide.html
---
> Use `@fileoverview` only when a non-obvious module constraint cannot be conveyed by names and structure.

## Why

Routine summaries duplicate filenames and symbols. Reserve an overview for a real architectural constraint or external dependency; do not add one to every module. Required API and tooling documentation keeps its syntax. Prefer no comment when the code already explains itself.

## Bad

```typescript
/** @fileoverview Backoff timing helpers shared by the retry loop. */
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## Good

```typescript
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - documenting the symbols the overview introduces
- [typescript-api-modules-over-namespaces](api-modules-over-namespaces.md) - keeping one module's API in one file

---
id: typescript-doc-fileoverview
lang: typescript
prefix: doc
title: Open a module with a file overview
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
> Start a module with a `@fileoverview` comment that states what the file is for.

## Why

A reader landing in an unfamiliar file sees symbols before context; the per-symbol docs do not say how the pieces relate or when the module is the right one to use. One overview line orients the file before the first declaration.

## Bad

```typescript
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## Good

```typescript
/** @fileoverview Backoff timing helpers shared by the retry loop. */
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - documenting the symbols the overview introduces
- [typescript-api-modules-over-namespaces](api-modules-over-namespaces.md) - keeping one module's API in one file

---
id: typescript-doc-comment-internal
lang: typescript
prefix: doc
title: Keep internal notes as line comments
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [JSDoc, line comments, implementation notes]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-public]
sources:
  - title: Google TypeScript Style Guide - JSDoc versus comments
    url: https://google.github.io/styleguide/tsguide.html
---
> Use `/** */` for what consumers read and `//` for reasoning that stays inside the implementation.

## Why

JSDoc is the documentation surface: editors show it on hover and generators publish it. An internal note written as JSDoc is read as part of the contract, so reasoning about a private helper ends up in the public docs; a line comment keeps it where it belongs.

## Bad

```typescript
/** Builds the cache key from the user id. */
function cacheKey(userId: string): string {
  return `user:${userId}`;
}
```

## Good

```typescript
// The prefix keeps cache keys from colliding with other namespaces.
function cacheKey(userId: string): string {
  return `user:${userId}`;
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - the comments that do belong on the documentation surface

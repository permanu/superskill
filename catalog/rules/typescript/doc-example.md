---
id: typescript-doc-example
lang: typescript
prefix: doc
title: Show usage in an example block
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["@example", usage, documentation]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-public, typescript-doc-jsdoc-tags]
sources:
  - title: JSDoc - @example
    url: https://jsdoc.app/tags-example
---
> Show a concrete call and its result in `@example` when the usage is not obvious from the signature.

## Why

Prose says what a function does; an example shows the call shape, the argument order, and a real result, which is what a reader copying the call actually needs. It also pins the behavior that a future change would have to keep.

## Bad

```typescript
/** Normalizes a header name to lowercase. */
export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}
```

## Good

```typescript
/**
 * Normalizes a header name to lowercase.
 *
 * @example
 * normalizeHeader("  Accept  ");
 * // "accept"
 */
export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - the summary the example accompanies
- [typescript-doc-jsdoc-tags](doc-jsdoc-tags.md) - documenting parameters the example demonstrates

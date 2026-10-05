---
id: typescript-doc-see-link
lang: typescript
prefix: doc
title: Connect related symbols with JSDoc links
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["@see", "@link", cross-reference]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-public]
sources:
  - title: TypeScript Handbook - JSDoc Reference
    url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
---
> Point to a related symbol with `@see` and `{@link}` instead of naming it in prose.

## Why

A plain name in a comment is dead text: the reader has to search for it and the reference breaks silently when the symbol is renamed. A link tag becomes a navigable reference in editors and generated docs, and the rename tooling follows it.

## Bad

```typescript
/**
 * Parses a retry header.
 *
 * Use retryDelay for the backoff this value configures.
 */
export function parseRetryAfter(value: string): number {
  return Number(value);
}
```

## Good

```typescript
/**
 * Parses a retry header.
 *
 * @see {@link retryDelay} for the backoff this value configures.
 */
export function parseRetryAfter(value: string): number {
  return Number(value);
}

export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - the summaries these references extend

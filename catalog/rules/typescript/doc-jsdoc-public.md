---
id: typescript-doc-jsdoc-public
lang: typescript
prefix: doc
title: Document non-obvious public API contracts
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [JSDoc, documentation, exported API]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-tags, typescript-api-explicit-return-types]
sources:
  - title: Google TypeScript Style Guide - comments and documentation
    url: https://google.github.io/styleguide/tsguide.html
  - title: TypeScript Handbook - JSDoc Reference
    url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
---
> Document public API constraints that names and types cannot express; omit summaries that merely repeat the declaration.

## Why

JSDoc appears in editor hovers and generated API documentation, so use it for units, ownership, exceptions, side effects and external compatibility constraints that callers cannot infer. Export status alone does not justify narration: first improve names and types, then document the remaining contract. Preserve documentation required by the project's public API tooling.

## Bad

```typescript
/** Returns a retry delay. */
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## Good

```typescript
export function retryDelayMs(attempt: number): number {
  return attempt * 100;
}
```

## See Also

- [typescript-doc-jsdoc-tags](doc-jsdoc-tags.md) - recording parameter meaning the signature cannot show
- [typescript-api-explicit-return-types](api-explicit-return-types.md) - the type half of the same contract

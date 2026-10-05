---
id: typescript-doc-jsdoc-public
lang: typescript
prefix: doc
title: Document exported symbols with JSDoc
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
> Give every exported symbol a JSDoc summary so consumers read the contract without opening the implementation.

## Why

An exported name and its type say what a value is, not what it means or which corner cases it handles. A JSDoc summary is what editors show on hover and what documentation tools collect, so the reader stays at the call site instead of tracing the body.

## Bad

```typescript
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## Good

```typescript
/** Returns the backoff delay in milliseconds for a retry attempt. */
export function retryDelay(attempt: number): number {
  return attempt * 100;
}
```

## See Also

- [typescript-doc-jsdoc-tags](doc-jsdoc-tags.md) - recording parameter meaning the signature cannot show
- [typescript-api-explicit-return-types](api-explicit-return-types.md) - the type half of the same contract

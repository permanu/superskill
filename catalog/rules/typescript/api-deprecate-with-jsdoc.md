---
id: typescript-api-deprecate-with-jsdoc
lang: typescript
prefix: api
title: Mark superseded exports with @deprecated and the replacement
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deprecated, JSDoc, migration, replacement]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [deprecated]
related: [typescript-api-minimal-surface, typescript-api-named-exports]
sources:
  - title: TypeScript Handbook - JSDoc Reference (@deprecated)
    url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
  - title: typescript-eslint - no-deprecated
    url: https://typescript-eslint.io/rules/no-deprecated/
---
> Mark a superseded export with `@deprecated` and the replacement so editors flag it.

## Why

Deleting an export breaks consumers without warning, and leaving it unmarked lets new callers adopt code that is already scheduled for removal. The `@deprecated` tag is surfaced by editors as a strikethrough and can be enforced by a lint rule, so the migration path is visible at the call site.

## Bad

```typescript
export function parseUrl(value: string): URL {
  return new URL(value);
}
```

## Good

```typescript
/** @deprecated Use the WHATWG URL constructor directly. */
export function parseUrl(value: string): URL {
  return new URL(value);
}
```

## See Also

- [typescript-api-minimal-surface](api-minimal-surface.md) - the surface the deprecation shrinks
- [typescript-api-named-exports](api-named-exports.md) - how the replacement is exported

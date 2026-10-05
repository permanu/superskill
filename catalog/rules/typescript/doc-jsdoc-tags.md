---
id: typescript-doc-jsdoc-tags
lang: typescript
prefix: doc
title: Record parameter meaning with JSDoc tags
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [JSDoc, "@param", "@returns"]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-doc-jsdoc-public, typescript-const-named-magic]
sources:
  - title: TypeScript Handbook - JSDoc Reference
    url: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
---
> Document parameters and results with `@param` and `@returns` when the types do not carry the meaning.

## Why

Parameter names and types rarely state units, ranges, or which value is counted from zero; that meaning lives only in the caller's head until it is written down. The tags put it on the declaration, where hover text and documentation tools show it.

## Bad

```typescript
/** Scales a value. */
export function scale(value: number, factor: number): number {
  return value * factor;
}
```

## Good

```typescript
/**
 * Scales a value.
 *
 * @param value - the quantity to scale.
 * @param factor - the multiplier to apply, where 1 keeps the value unchanged.
 * @returns the scaled quantity.
 */
export function scale(value: number, factor: number): number {
  return value * factor;
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - the summary these tags extend
- [typescript-const-named-magic](const-named-magic.md) - naming the values that would otherwise need explaining

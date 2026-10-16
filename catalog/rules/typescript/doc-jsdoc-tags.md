---
id: typescript-doc-jsdoc-tags
lang: typescript
prefix: doc
title: Attach non-obvious parameter and result contracts to JSDoc tags
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
  - title: ECMAScript specification - TypedArray.prototype.subarray
    url: https://tc39.es/ecma262/multipage/indexed-collections.html#sec-%typedarray%.prototype.subarray
---
> Document parameters and results with `@param` and `@returns` when the types do not carry the meaning.

## Why

Improve names and types first, then document the remaining caller-visible constraint. Tags are useful when a signature cannot express an aliasing or lifetime contract, but descriptions such as "the quantity to scale" add nothing to a parameter named value. Keep the actual constraint available to editors and API documentation without narrating the implementation.

## Bad

```typescript
/** Returns the frame payload. */
export function framePayload(frame: Uint8Array, headerBytes: number): Uint8Array {
  if (!Number.isInteger(headerBytes) || headerBytes < 0 || headerBytes > frame.length) throw new RangeError("Invalid header length");
  return frame.subarray(headerBytes);
}
```

## Good

```typescript
/**
 * @param headerBytes Integer offset from zero through frame.length; otherwise throws RangeError.
 * @returns A view sharing the input buffer; writes in the shared range affect both views.
 */
export function framePayload(frame: Uint8Array, headerBytes: number): Uint8Array {
  if (!Number.isInteger(headerBytes) || headerBytes < 0 || headerBytes > frame.length) throw new RangeError("Invalid header length");
  return frame.subarray(headerBytes);
}
```

## See Also

- [typescript-doc-jsdoc-public](doc-jsdoc-public.md) - the summary these tags extend
- [typescript-const-named-magic](const-named-magic.md) - naming the values that would otherwise need explaining

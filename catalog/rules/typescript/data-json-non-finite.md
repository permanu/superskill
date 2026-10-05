---
id: typescript-data-json-non-finite
lang: typescript
prefix: data
title: Reject non-finite numbers before serializing
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NaN, Infinity, serialization]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.isFinite]
related: [typescript-data-json-special-values, typescript-data-large-integers]
sources:
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Check `Number.isFinite` before stringifying so a `NaN` or `Infinity` cannot silently become null.

## Why

`JSON.stringify` writes `null` for `Infinity` and `NaN`, so an arithmetic bug turns into a missing value on the wire with no error anywhere. A finiteness check at the boundary either fixes the number or fails the request.

## Bad

```typescript
export function serialize(ratio: number): string {
  return JSON.stringify({ ratio });
}
```

## Good

```typescript
export function serialize(ratio: number): string {
  if (!Number.isFinite(ratio)) {
    throw new Error("ratio must be finite");
  }
  return JSON.stringify({ ratio });
}
```

## See Also

- [typescript-data-json-special-values](data-json-special-values.md) - the container and BigInt values JSON cannot carry
- [typescript-data-large-integers](data-large-integers.md) - the precision limit on the numbers JSON can carry

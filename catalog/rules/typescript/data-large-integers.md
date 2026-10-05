---
id: typescript-data-large-integers
lang: typescript
prefix: data
title: Send integers beyond the safe range as strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [MAX_SAFE_INTEGER, precision, identifiers]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.MAX_SAFE_INTEGER]
related: [typescript-data-json-special-values, typescript-data-explicit-wire-shape]
sources:
  - title: MDN - Number.MAX_SAFE_INTEGER
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Encode identifiers and counters above `Number.MAX_SAFE_INTEGER` as strings so no precision is lost.

## Why

JSON numbers are IEEE 754 doubles, so integers above `Number.MAX_SAFE_INTEGER` cannot be represented exactly and distinct values collapse onto the same number. A decimal string preserves the digits, and the consumer decides how to hold them.

## Bad

```typescript
export function serialize(id: bigint): string {
  return JSON.stringify({ id: Number(id) });
}
```

## Good

```typescript
export function serialize(id: bigint): string {
  return JSON.stringify({ id: id.toString() });
}
```

## See Also

- [typescript-data-json-special-values](data-json-special-values.md) - converting BigInt because stringify rejects it
- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - deciding the encoded form of each field

---
id: typescript-data-json-special-values
lang: typescript
prefix: data
title: Convert Map, Set, and BigInt before JSON.stringify
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Map, Set, BigInt, serialization]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [JSON.stringify]
related: [typescript-data-json-non-finite, typescript-data-explicit-wire-shape]
sources:
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Convert values JSON cannot represent — Map and Set to arrays or objects, BigInt to a string — before stringifying.

## Why

`JSON.stringify` does not throw for a Map or Set: it serializes them as `{}`, so the data vanishes silently. A BigInt throws a `TypeError` instead. Converting each value at the boundary keeps the payload complete and the failure loud.

## Bad

```typescript
export function serialize(scores: Map<string, number>): string {
  return JSON.stringify(scores);
}
```

## Good

```typescript
export function serialize(scores: Map<string, number>): string {
  return JSON.stringify(Object.fromEntries(scores));
}
```

## See Also

- [typescript-data-json-non-finite](data-json-non-finite.md) - the number values JSON rewrites to null
- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - choosing the serialized shape by hand

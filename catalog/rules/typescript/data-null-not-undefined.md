---
id: typescript-data-null-not-undefined
lang: typescript
prefix: data
title: Represent absent wire values as null, not an optional property
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["null", undefined, optional property]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [JSON.stringify]
related: [typescript-data-explicit-wire-shape, typescript-type-optional-not-undefined]
sources:
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
  - title: MDN - JSON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
> Give a JSON field the type `T | null` when absence must survive serialization; `undefined` disappears from the payload.

## Why

JSON has no `undefined`: a property whose value is `undefined` is dropped by `JSON.stringify`, so consumers see a missing key and cannot tell absence from a serializer bug. `null` is a first-class JSON value and survives the round trip as an explicit no-value.

## Bad

```typescript
export interface Profile {
  nickname?: string;
}

export function serialize(profile: Profile): string {
  return JSON.stringify(profile);
}
```

## Good

```typescript
export interface Profile {
  nickname: string | null;
}

export function serialize(profile: Profile): string {
  return JSON.stringify(profile);
}
```

## See Also

- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - choosing the fields the wire carries
- [typescript-type-optional-not-undefined](type-optional-not-undefined.md) - the internal-types counterpart: omit optional properties instead of assigning undefined

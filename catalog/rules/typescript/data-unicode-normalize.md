---
id: typescript-data-unicode-normalize
lang: typescript
prefix: data
title: Normalize Unicode text before storing or comparing it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Unicode, normalization, NFC]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [normalize]
related: [typescript-err-boundary-parse]
sources:
  - title: MDN - String.prototype.normalize
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
---
> Normalize text with `String.prototype.normalize` at the boundary so equivalent strings compare equal.

## Why

The same visible text can be encoded with different code point sequences, so a name built from a precomposed accented letter and one built from the base letter plus a combining accent are not `===`. Normalizing to one form once, at the boundary, keeps comparisons, keys, and lookups consistent.

## Bad

```typescript
export function sameName(first: string, second: string): boolean {
  return first === second;
}
```

## Good

```typescript
export function sameName(first: string, second: string): boolean {
  return first.normalize() === second.normalize();
}
```

## See Also

- [typescript-err-boundary-parse](err-boundary-parse.md) - the boundary where text should be normalized once

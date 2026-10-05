---
id: typescript-data-json-canonical
lang: typescript
prefix: data
title: Canonicalize JSON before hashing or signing it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [canonical JSON, digest, signature]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [JSON.stringify]
related: [typescript-data-explicit-wire-shape, typescript-data-key-order]
sources:
  - title: RFC 8785 - JSON Canonicalization Scheme (JCS)
    url: https://www.rfc-editor.org/rfc/rfc8785.html
  - title: MDN - JSON.stringify
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
---
> Canonicalize a payload before hashing or signing it so key order and number formatting cannot change the digest.

## Why

`JSON.stringify` output follows property insertion order and number formatting, so two equivalent payloads produce different bytes and signatures that should verify fail. A canonical form with sorted keys and deterministic numbers makes the digest depend on the data, not on how it was assembled.

## Bad

```typescript
declare function sha256(input: string): string;

export function digest(payload: { b: number; a: number }): string {
  return sha256(JSON.stringify(payload));
}
```

## Good

```typescript
declare function sha256(input: string): string;
declare function canonicalize(payload: unknown): string;

export function digest(payload: { b: number; a: number }): string {
  return sha256(canonicalize(payload));
}
```

## See Also

- [typescript-data-explicit-wire-shape](data-explicit-wire-shape.md) - fixing the fields the digest covers
- [typescript-data-key-order](data-key-order.md) - why object key order is not part of the data

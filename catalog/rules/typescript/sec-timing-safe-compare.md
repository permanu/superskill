---
id: typescript-sec-timing-safe-compare
lang: typescript
prefix: sec
title: Compare secrets with a constant-time function, not equality
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timing attack, timingSafeEqual, token, comparison]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [timingSafeEqual]
related: [typescript-sec-secure-random, typescript-sec-secrets-from-env]
sources:
  - title: Node.js - Crypto (crypto.timingSafeEqual)
    url: https://nodejs.org/api/crypto.html
---
> Compare secrets with a constant-time function, not `===`.

## Why

String equality returns as soon as two values differ, so the time it takes leaks how many leading characters matched and lets an attacker recover a token byte by byte. `crypto.timingSafeEqual` compares the underlying bytes with a constant-time algorithm and is intended for secret values.

## Bad

```typescript
function verifyToken(expected: string, actual: string): boolean {
  return expected === actual;
}
```

## Good

```typescript
declare function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
declare function utf8(value: string): Uint8Array;

function verifyToken(expected: string, actual: string): boolean {
  const a = utf8(expected);
  const b = utf8(actual);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
```

## See Also

- [typescript-sec-secure-random](sec-secure-random.md) - generating a token worth comparing this way
- [typescript-sec-secrets-from-env](sec-secrets-from-env.md) - storing the expected value

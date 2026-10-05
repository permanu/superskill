---
id: typescript-sec-secure-random
lang: typescript
prefix: sec
title: Generate tokens with crypto.getRandomValues, not Math.random
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, token, crypto, Math.random]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Math.random, crypto]
related: [typescript-sec-timing-safe-compare, typescript-sec-secrets-from-env]
sources:
  - title: MDN - Crypto.getRandomValues()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
  - title: OWASP - Secrets Management Cheat Sheet (creation)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
---
> Generate tokens with `crypto.getRandomValues`, not `Math.random`.

## Why

`Math.random` is a non-cryptographic generator whose output is predictable once its internal state is known, so tokens built from it can be guessed or reproduced. `crypto.getRandomValues` fills a typed array from a generator seeded with platform entropy and is suitable for cryptographic use.

## Bad

```typescript
function createToken(): string {
  return Math.random().toString(36).slice(2);
}
```

## Good

```typescript
function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
```

## See Also

- [typescript-sec-timing-safe-compare](sec-timing-safe-compare.md) - verifying the token without leaking timing
- [typescript-sec-secrets-from-env](sec-secrets-from-env.md) - storing the generated value

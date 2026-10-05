---
id: typescript-sec-secrets-from-env
lang: typescript
prefix: sec
title: Load secrets from the environment or a secret store, never source literals
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [secret, API key, environment, credentials]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [process.env]
related: [typescript-sec-tls-only, typescript-sec-secure-random]
sources:
  - title: OWASP - Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  - title: Node.js - Process (process.env)
    url: https://nodejs.org/api/process.html
---
> Load secrets from the environment or a secret store, never source literals.

## Why

A secret committed to source is copied into every clone, build artifact, and container image, and rotation cannot reach the copies that already leaked. Injecting it at runtime through the environment or a secret manager keeps the value out of version control and lets access be scoped and rotated centrally.

## Bad

```typescript
const apiKey = "sk_live_51H8xQ2eZvKYlo2C";
```

## Good

```typescript
declare const process: { env: Record<string, string | undefined> };

function apiKey(): string {
  const value = process.env.API_KEY;
  if (value === undefined) {
    throw new Error("API_KEY is not configured");
  }
  return value;
}
```

## See Also

- [typescript-sec-tls-only](sec-tls-only.md) - transporting the secret securely
- [typescript-sec-secure-random](sec-secure-random.md) - generating secrets worth storing

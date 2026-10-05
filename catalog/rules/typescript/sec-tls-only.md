---
id: typescript-sec-tls-only
lang: typescript
prefix: sec
title: Send credentials only over TLS
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [https, TLS, plaintext, credentials]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [fetch]
related: [typescript-sec-secrets-from-env, typescript-sec-fetch-credentials]
sources:
  - title: OWASP - Secrets Management Cheat Sheet (TLS everywhere)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  - title: OWASP - Transport Layer Security Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
---
> Send credentials and tokens only over HTTPS; plaintext transport exposes them to interception.

## Why

An `http` URL carries the request in the clear, so any intermediary on the path can read and modify the credentials it contains. TLS authenticates the server and encrypts the exchange, and the OWASP guidance is to transmit no secret over plaintext.

## Bad

```typescript
function apiUrl(host: string): string {
  return `http://${host}/token`;
}
```

## Good

```typescript
function apiUrl(host: string): string {
  return `https://${host}/token`;
}
```

## See Also

- [typescript-sec-secrets-from-env](sec-secrets-from-env.md) - where the credential comes from
- [typescript-sec-fetch-credentials](sec-fetch-credentials.md) - controlling when credentials are attached

---
id: typescript-sec-fetch-credentials
lang: typescript
prefix: sec
title: Send credentials only same-origin with fetch
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fetch, credentials, CSRF, cookies]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [fetch]
related: [typescript-sec-tls-only, typescript-async-fetch-status-check]
sources:
  - title: MDN - Using the Fetch API (including credentials)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  - title: OWASP - Cross-Site Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
---
> Send credentials only same-origin with fetch.

## Why

`credentials: "include"` attaches cookies and authorization headers to cross-origin requests, which lets any origin the application talks to trigger authenticated actions and exposes the session to CSRF. The default `same-origin` keeps credentials on requests to the application's own origin, where the browser's same-origin policy still applies.

## Bad

```typescript
async function load(url: string): Promise<Response> {
  return fetch(url, { credentials: "include" });
}
```

## Good

```typescript
async function load(url: string): Promise<Response> {
  return fetch(url, { credentials: "same-origin" });
}
```

## See Also

- [typescript-sec-tls-only](sec-tls-only.md) - encrypting the request that carries credentials
- [typescript-async-fetch-status-check](async-fetch-status-check.md) - handling the response after it arrives

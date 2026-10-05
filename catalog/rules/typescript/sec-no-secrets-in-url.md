---
id: typescript-sec-no-secrets-in-url
lang: typescript
prefix: sec
title: Keep secrets out of URLs; put them in headers or the body
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [token, query string, URL, credentials]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [URL]
related: [typescript-sec-secrets-from-env, typescript-sec-fetch-credentials]
sources:
  - title: RFC 9110 - HTTP Semantics, Disclosure of Sensitive Information in URIs
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-disclosure-of-sensitive-information-in-uris
  - title: OWASP - Secrets Management Cheat Sheet (transport)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
---
> Keep secrets out of URLs; put them in headers or the request body.

## Why

URLs are recorded in browser history, proxy and server access logs, and referrer headers, so a token in a query string is copied into systems that were never meant to hold it. Headers and bodies travel with the request but are not part of the address, which keeps the secret out of every log that records one.

## Bad

```typescript
function loginUrl(token: string): string {
  return `https://api.example.com/session?token=${token}`;
}
```

## Good

```typescript
interface Request {
  url: string;
  headers: Record<string, string>;
}

function loginRequest(token: string): Request {
  return {
    url: "https://api.example.com/session",
    headers: { authorization: `Bearer ${token}` },
  };
}
```

## See Also

- [typescript-sec-secrets-from-env](sec-secrets-from-env.md) - where the token is stored
- [typescript-sec-fetch-credentials](sec-fetch-credentials.md) - controlling whether credentials travel at all

---
id: typescript-net-accept-json
lang: typescript
prefix: net
title: Ask for the representation you can parse
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Accept, content negotiation, JSON]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-net-content-type, typescript-async-fetch-status-check]
sources:
  - title: RFC 9110 - Accept
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-accept
---
> Send `Accept: application/json` when the caller needs JSON instead of whatever the server defaults to.

## Why

Content negotiation is how the client states which media types it can handle; without the header the server picks a default representation, which may be HTML or XML. Naming the format keeps the response parseable by the code that reads it.

## Bad

```typescript
export function load(url: string): Promise<Response> {
  return fetch(url);
}
```

## Good

```typescript
export function load(url: string): Promise<Response> {
  return fetch(url, { headers: { accept: "application/json" } });
}
```

## See Also

- [typescript-net-content-type](net-content-type.md) - the request-side counterpart
- [typescript-async-fetch-status-check](async-fetch-status-check.md) - checking the response before reading it

---
id: typescript-net-conditional-get
lang: typescript
prefix: net
title: Revalidate cached resources with If-None-Match
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [If-None-Match, ETag, caching]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-net-conditional-update, typescript-net-retry-after]
sources:
  - title: RFC 9110 - If-None-Match
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-if-none-match
---
> Send the stored ETag as `If-None-Match` so an unchanged resource answers 304 without a body.

## Why

Re-fetching a resource you already hold transfers the representation again even when nothing changed. The conditional request makes the method conditional on the stored entity tag, and the server answers 304 when the representation still matches.

## Bad

```typescript
export function load(url: string): Promise<Response> {
  return fetch(url);
}
```

## Good

```typescript
export function load(url: string, etag: string): Promise<Response> {
  return fetch(url, { headers: { "if-none-match": etag } });
}
```

## See Also

- [typescript-net-conditional-update](net-conditional-update.md) - the write-side precondition
- [typescript-net-retry-after](net-retry-after.md) - the other server hint a client should read

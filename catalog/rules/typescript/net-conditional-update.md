---
id: typescript-net-conditional-update
lang: typescript
prefix: net
title: Guard updates with If-Match
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [If-Match, ETag, lost update]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-net-conditional-get, typescript-net-content-type]
sources:
  - title: RFC 9110 - If-Match
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-if-match
---
> Send the version's ETag as `If-Match` so a write fails when someone else changed the resource.

## Why

Two clients that read the same version can both write, and the second silently overwrites the first. `If-Match` makes the request conditional on the entity tag still matching, turning the lost update into a failed request the caller can retry.

## Bad

```typescript
export function save(url: string, body: { title: string }): Promise<Response> {
  return fetch(url, { method: "PUT", body: JSON.stringify(body) });
}
```

## Good

```typescript
export function save(url: string, body: { title: string }, etag: string): Promise<Response> {
  return fetch(url, {
    method: "PUT",
    headers: { "if-match": etag },
    body: JSON.stringify(body),
  });
}
```

## See Also

- [typescript-net-conditional-get](net-conditional-get.md) - the read-side precondition
- [typescript-net-content-type](net-content-type.md) - declaring the body the write carries

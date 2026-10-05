---
id: typescript-net-form-body
lang: typescript
prefix: net
title: Send form data with URLSearchParams
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [form data, URLSearchParams, encoding]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-io-url-encode, typescript-net-content-type]
sources:
  - title: MDN - URLSearchParams
    url: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
  - title: MDN - Using the Fetch API
    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
---
> Encode form fields with `URLSearchParams` instead of concatenating `key=value` pairs.

## Why

Hand-built form strings must escape every reserved character themselves and set the matching content type. `URLSearchParams` encodes each field, and the fetch layer sets the form media type when the object is used as the body.

## Bad

```typescript
export function login(url: string, user: string, password: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `user=${user}&password=${password}`,
  });
}
```

## Good

```typescript
export function login(url: string, user: string, password: string): Promise<Response> {
  return fetch(url, {
    method: "POST",
    body: new URLSearchParams({ user, password }),
  });
}
```

## See Also

- [typescript-io-url-encode](io-url-encode.md) - the query-string form of the same encoder
- [typescript-net-content-type](net-content-type.md) - declaring the media type for hand-built bodies

---
id: typescript-io-url-encode
lang: typescript
prefix: io
title: Build query strings with URLSearchParams
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [URLSearchParams, query string, encoding]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [URLSearchParams]
related: [typescript-io-path-join, typescript-sec-no-secrets-in-url]
sources:
  - title: MDN - URLSearchParams
    url: https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
---
> Encode query values through `URLSearchParams` instead of interpolating them into a URL string.

## Why

Interpolating a value into a URL lets spaces, `&`, `#`, and non-ASCII characters change the URL's structure, so a search term can add parameters or truncate the path. `searchParams` percent-encodes each value and keeps it a value.

## Bad

```typescript
export function searchUrl(query: string): string {
  return `https://api.example.com/search?q=${query}`;
}
```

## Good

```typescript
export function searchUrl(query: string): string {
  const url = new URL("https://api.example.com/search");
  url.searchParams.set("q", query);
  return url.toString();
}
```

## See Also

- [typescript-io-path-join](io-path-join.md) - the filesystem equivalent of joining structured paths
- [typescript-sec-no-secrets-in-url](sec-no-secrets-in-url.md) - what should never travel in a query string

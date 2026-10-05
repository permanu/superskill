---
id: typescript-net-content-type
lang: typescript
prefix: net
title: Declare the body's media type with Content-Type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Content-Type, request body, media type]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-net-accept-json, typescript-net-form-body]
sources:
  - title: RFC 9110 - Content-Type
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-content-type
---
> Set `Content-Type` to the body's actual media type when sending a request body.

## Why

The `Content-Type` field states the media type of the enclosed representation, which defines both the data format and how it is intended to be processed. Without it the server falls back to a guess or rejects the body outright.

## Bad

```typescript
export function save(url: string, body: { id: string }): Promise<Response> {
  return fetch(url, { method: "POST", body: JSON.stringify(body) });
}
```

## Good

```typescript
export function save(url: string, body: { id: string }): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
```

## See Also

- [typescript-net-accept-json](net-accept-json.md) - declaring the media type you can read back
- [typescript-net-form-body](net-form-body.md) - the body type that sets its own header

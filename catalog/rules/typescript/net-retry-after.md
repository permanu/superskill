---
id: typescript-net-retry-after
lang: typescript
prefix: net
title: Honor Retry-After before retrying a request
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Retry-After, "429", backoff]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-err-retry-idempotent, typescript-net-conditional-update]
sources:
  - title: RFC 9110 - Retry-After
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
---
> Wait the duration the server asks for in `Retry-After` instead of a fixed delay.

## Why

RFC 9110 defines `Retry-After` as either a number of seconds or an HTTP-date, so a fixed delay ignores the server's hint and a parser that reads only seconds turns the date form into an immediate retry. Reading both forms keeps the wait aligned with the server's recovery.

## Bad

```typescript
export async function fetchWithRetry(url: string): Promise<Response> {
  const response = await fetch(url);
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetch(url);
  }
  return response;
}
```

## Good

```typescript
function retryDelay(header: string | null): number {
  if (header === null) {
    return 1000;
  }
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) {
    return 1000;
  }
  return Math.max(0, date - Date.now());
}

export async function fetchWithRetry(url: string): Promise<Response> {
  const response = await fetch(url);
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, retryDelay(response.headers.get("retry-after"))));
    return fetch(url);
  }
  return response;
}
```

## See Also

- [typescript-err-retry-idempotent](err-retry-idempotent.md) - retrying only operations that are safe to repeat
- [typescript-net-conditional-update](net-conditional-update.md) - the other precondition that keeps a request honest

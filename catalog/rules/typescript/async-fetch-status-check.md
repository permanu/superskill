---
id: typescript-async-fetch-status-check
lang: typescript
prefix: async
title: Check response.ok because fetch rejects only on network errors
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fetch, response, status, ok]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [fetch, Response]
related: [typescript-err-no-swallow, typescript-async-timeout-signal]
sources:
  - title: MDN - Using the Fetch API (checking response status)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
  - title: MDN - Using promises (error handling)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Check `response.ok` before reading a fetch response; HTTP error statuses still fulfill the promise.

## Why

`fetch` rejects for network failures and bad URLs, but a `404` or `500` response is delivered as a normal fulfillment, so parsing its body treats an error page as data. Checking `response.ok` and throwing before reading converts the status into a failure the caller's error path can see.

## Bad

```typescript
async function getData(url: string): Promise<unknown> {
  const response = await fetch(url);
  return response.json();
}
```

## Good

```typescript
async function getData(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }
  return response.json();
}
```

## See Also

- [typescript-err-no-swallow](err-no-swallow.md) - why the status check must raise rather than return a default
- [typescript-async-timeout-signal](async-timeout-signal.md) - bounding the request itself

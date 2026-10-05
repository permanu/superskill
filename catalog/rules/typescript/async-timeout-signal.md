---
id: typescript-async-timeout-signal
lang: typescript
prefix: async
title: Bound network calls with a timeout signal
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timeout, AbortSignal, fetch, stalled]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AbortSignal.timeout, fetch]
related: [typescript-err-abort-cancellation, typescript-async-race-cancel]
sources:
  - title: MDN - AbortSignal (aborting with a timeout)
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
  - title: MDN - Using the Fetch API (canceling a request)
    url: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
---
> Bound network calls with `AbortSignal.timeout` so a stalled peer cannot hang the caller.

## Why

A network request without a deadline waits for the peer indefinitely, and one stalled connection can hold a request handler, a worker slot, or a user-visible spinner forever. A timeout signal aborts the operation and rejects it with a distinguishable timeout reason the caller can act on.

## Bad

```typescript
async function load(url: string): Promise<Response> {
  return fetch(url);
}
```

## Good

```typescript
async function load(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(5000) });
}
```

## See Also

- [typescript-err-abort-cancellation](err-abort-cancellation.md) - treating the abort as cancellation rather than failure
- [typescript-async-race-cancel](async-race-cancel.md) - cancelling operations that lose a race

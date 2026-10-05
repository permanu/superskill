---
id: typescript-async-race-cancel
lang: typescript
prefix: async
title: Cancel the losers of a race once the winner settles
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [race, abort, cancel, concurrency]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise.race, AbortController]
related: [typescript-async-timeout-signal, typescript-err-abort-cancellation]
sources:
  - title: MDN - Promise (concurrency)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
  - title: MDN - AbortSignal
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
---
> `Promise.race` does not cancel the losers; abort them with a signal once the race settles.

## Why

The losing operations of a race keep running after the result is decided, consuming connections, CPU, and quota for a result nobody reads. Passing one signal to every contender and aborting it in `finally` stops the abandoned work on both the success and failure paths.

## Bad

```typescript
declare function slow(): Promise<string>;
declare function fast(): Promise<string>;

async function first(): Promise<string> {
  return Promise.race([slow(), fast()]);
}
```

## Good

```typescript
declare function slow(signal: AbortSignal): Promise<string>;
declare function fast(signal: AbortSignal): Promise<string>;

async function first(): Promise<string> {
  const controller = new AbortController();
  try {
    return await Promise.race([slow(controller.signal), fast(controller.signal)]);
  } finally {
    controller.abort();
  }
}
```

## See Also

- [typescript-async-timeout-signal](async-timeout-signal.md) - bounding each contender with a timeout
- [typescript-err-abort-cancellation](err-abort-cancellation.md) - handling the resulting aborts as cancellations

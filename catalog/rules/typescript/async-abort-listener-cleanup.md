---
id: typescript-async-abort-listener-cleanup
lang: typescript
prefix: async
title: Remove abort listeners when the operation finishes
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abort, listener, cleanup, finally]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AbortSignal, addEventListener]
related: [typescript-async-timeout-signal, typescript-err-finally-cleanup]
sources:
  - title: MDN - AbortSignal (removing the abort event listener)
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
  - title: MDN - try...catch (resource cleanup using finally)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
---
> Remove abort listeners in `finally` so long-lived signals do not retain callbacks.

## Why

`{ once: true }` removes a listener only when the event fires; if the operation completes without an abort, the listener stays attached to a signal that can outlive the request. Repeated operations then accumulate callbacks and the values they close over, so removal must happen on every exit path.

## Bad

```typescript
declare function poll(signal: AbortSignal): Promise<void>;
declare function stop(): void;

async function start(signal: AbortSignal): Promise<void> {
  signal.addEventListener("abort", () => stop(), { once: true });
  await poll(signal);
}
```

## Good

```typescript
declare function poll(signal: AbortSignal): Promise<void>;
declare function stop(): void;

async function start(signal: AbortSignal): Promise<void> {
  const onAbort = () => stop();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    await poll(signal);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
```

## See Also

- [typescript-async-timeout-signal](async-timeout-signal.md) - signals that carry a timeout listener
- [typescript-err-finally-cleanup](err-finally-cleanup.md) - the general cleanup contract

---
id: typescript-async-abort-early-check
lang: typescript
prefix: async
title: Check the abort signal between units of work
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abort, throwIfAborted, loop, cancellation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AbortSignal, throwIfAborted]
related: [typescript-err-abort-cancellation, typescript-async-abort-listener-cleanup]
sources:
  - title: MDN - AbortSignal (throwIfAborted)
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
  - title: MDN - Using promises (cancellation)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Call `signal.throwIfAborted()` between work items so cancellation stops the loop before the next side effect.

## Why

A long loop that only checks the signal inside its innermost operation still performs one more item of work, and that item can send a request or write data the caller has already abandoned. Checking the signal at the top of each iteration stops the batch at a boundary instead of mid-item.

## Bad

```typescript
declare function handle(item: string): Promise<void>;

async function process(items: string[]): Promise<void> {
  for (const item of items) {
    await handle(item);
  }
}
```

## Good

```typescript
declare function handle(item: string): Promise<void>;

async function process(items: string[], signal: AbortSignal): Promise<void> {
  for (const item of items) {
    signal.throwIfAborted();
    await handle(item);
  }
}
```

## See Also

- [typescript-err-abort-cancellation](err-abort-cancellation.md) - classifying the thrown abort reason correctly
- [typescript-async-abort-listener-cleanup](async-abort-listener-cleanup.md) - cleaning up signal listeners

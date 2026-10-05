---
id: typescript-conc-interval-cleanup
lang: typescript
prefix: conc
title: Return a way to stop an interval
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [setInterval, clearInterval, cleanup]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [setInterval]
related: [typescript-async-abort-listener-cleanup, typescript-conc-worker-terminate]
sources:
  - title: MDN - Window.setInterval
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
---
> Give callers a stop function for any interval you start so the timer can be cleared.

## Why

`setInterval` keeps calling its callback, and keeps the process alive, until `clearInterval` receives the same handle; a helper that hides the handle makes stopping impossible. Returning a stop function keeps the timer's lifetime with its owner.

## Bad

```typescript
export function start(onTick: () => void): void {
  setInterval(onTick, 1000);
}
```

## Good

```typescript
export function start(onTick: () => void): { stop(): void } {
  const timer = setInterval(onTick, 1000);
  return {
    stop(): void {
      clearInterval(timer);
    },
  };
}
```

## See Also

- [typescript-async-abort-listener-cleanup](async-abort-listener-cleanup.md) - removing the listeners that fed the timer
- [typescript-conc-worker-terminate](conc-worker-terminate.md) - the same lifetime discipline for workers

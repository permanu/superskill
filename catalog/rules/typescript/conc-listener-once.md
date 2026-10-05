---
id: typescript-conc-listener-once
lang: typescript
prefix: conc
title: Use the once option for one-shot listeners
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [addEventListener, once, listener]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [addEventListener]
related: [typescript-async-abort-listener-cleanup]
sources:
  - title: MDN - EventTarget.addEventListener (once)
    url: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
---
> Register one-shot listeners with `{ once: true }` instead of removing them inside the handler.

## Why

Manual removal must pass the exact same function object that was registered, so wrapping the listener is an easy source of leaks and dead handlers. The `once` option removes the listener after its first call, with no handle to track.

## Bad

```typescript
export function onReady(target: EventTarget, ready: () => void): void {
  target.addEventListener("ready", () => {
    target.removeEventListener("ready", ready);
    ready();
  });
}
```

## Good

```typescript
export function onReady(target: EventTarget, ready: () => void): void {
  target.addEventListener("ready", () => ready(), { once: true });
}
```

## See Also

- [typescript-async-abort-listener-cleanup](async-abort-listener-cleanup.md) - removing the listeners that outlive their operation

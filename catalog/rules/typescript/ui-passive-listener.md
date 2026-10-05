---
id: typescript-ui-passive-listener
lang: typescript
prefix: ui
title: Mark scroll-driving listeners passive
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [passive, wheel, event listener]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-conc-listener-once, typescript-perf-raf-batch]
sources:
  - title: MDN - EventTarget.addEventListener (passive)
    url: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
---
> Register `wheel` and touch listeners with `{ passive: true }` when the handler never calls `preventDefault`.

## Why

A non-passive `wheel` listener forces the browser to wait for the handler before it can start scrolling, which shows up as jank. `passive: true` promises the handler will not cancel the event, so the scroll can begin immediately.

## Bad

```typescript
export function onWheel(target: EventTarget, handler: () => void): void {
  target.addEventListener("wheel", handler);
}
```

## Good

```typescript
export function onWheel(target: EventTarget, handler: () => void): void {
  target.addEventListener("wheel", handler, { passive: true });
}
```

## See Also

- [typescript-conc-listener-once](conc-listener-once.md) - the other listener option that removes bookkeeping
- [typescript-perf-raf-batch](perf-raf-batch.md) - batching the visual work the scroll triggers

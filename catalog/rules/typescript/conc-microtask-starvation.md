---
id: typescript-conc-microtask-starvation
lang: typescript
prefix: conc
title: Do not requeue unbounded work as microtasks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [microtask, starvation, event loop]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [queueMicrotask]
related: [typescript-async-microtask-defer, typescript-conc-yield-long-work]
sources:
  - title: MDN - Using microtasks in JavaScript with queueMicrotask()
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
---
> Yield with a timer between passes of continuous work; a self-requeued microtask starves the event loop.

## Why

Microtasks queued during a microtask run in the same drain, before timers, I/O, or rendering get a turn, so a loop that re-queues itself as a microtask can run forever. A zero-delay timer ends the drain and lets the rest of the event loop proceed.

## Bad

```typescript
export function drain(work: () => boolean): void {
  if (work()) {
    queueMicrotask(() => drain(work));
  }
}
```

## Good

```typescript
export function drain(work: () => boolean): void {
  if (work()) {
    setTimeout(() => drain(work), 0);
  }
}
```

## See Also

- [typescript-async-microtask-defer](async-microtask-defer.md) - using a microtask for one-off deferral
- [typescript-conc-yield-long-work](conc-yield-long-work.md) - yielding during long synchronous work

---
id: typescript-async-microtask-defer
lang: typescript
prefix: async
title: Defer to the microtask queue with queueMicrotask, not a zero-delay timer
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [queueMicrotask, setTimeout, microtask, ordering]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [queueMicrotask, setTimeout]
related: [typescript-async-promise-constructor, typescript-async-no-misused-promises]
sources:
  - title: MDN - Using microtasks in JavaScript with queueMicrotask()
    url: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
  - title: MDN - Promise (task queues vs. microtasks)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
---
> Defer work to the microtask queue with `queueMicrotask`; `setTimeout(0)` schedules a separate task.

## Why

A zero-delay timer runs after the current task and after every queued microtask, so it can be delayed by rendering and other tasks and it reorders the callback relative to promise continuations. `queueMicrotask` runs the callback as soon as the current task's stack unwinds, which is the ordering deferred work usually intends.

## Bad

```typescript
function afterCurrentWork(callback: () => void): void {
  setTimeout(callback, 0);
}
```

## Good

```typescript
function afterCurrentWork(callback: () => void): void {
  queueMicrotask(callback);
}
```

## See Also

- [typescript-async-promise-constructor](async-promise-constructor.md) - the promise form of deferring work
- [typescript-async-no-misused-promises](async-no-misused-promises.md) - callbacks that must not float

---
id: typescript-conc-no-busy-wait
lang: typescript
prefix: conc
title: Never spin-wait for another task
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [busy wait, spin loop, event loop]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-conc-yield-long-work, typescript-async-microtask-defer]
sources:
  - title: Node.js - Don't Block the Event Loop
    url: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
---
> Wait with an awaited promise instead of a spin loop, which blocks the callback that would end the wait.

## Why

A synchronous `while` loop never returns control, so the callback or worker that would set the awaited flag never runs and the loop spins forever. Awaiting a timer or promise yields the event loop while the wait continues.

## Bad

```typescript
export function waitFor(flag: { done: boolean }): void {
  while (!flag.done) {
    // spin
  }
}
```

## Good

```typescript
export async function waitFor(flag: { done: boolean }): Promise<void> {
  while (!flag.done) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
```

## See Also

- [typescript-conc-yield-long-work](conc-yield-long-work.md) - giving pending events a turn during long work
- [typescript-async-microtask-defer](async-microtask-defer.md) - the microtask form of deferring work

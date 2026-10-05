---
id: typescript-conc-yield-long-work
lang: typescript
prefix: conc
title: Yield to the event loop between chunks of long work
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [event loop, yielding, chunks]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-perf-worker-offload, typescript-conc-no-busy-wait]
sources:
  - title: Node.js - Don't Block the Event Loop
    url: https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
---
> Break long computations into chunks that await a timer so pending events and I/O run between them.

## Why

A synchronous loop holds the event loop for its whole duration, so timers, I/O callbacks, and rendering wait behind it; Node's guidance is to partition the work so it regularly yields. Awaiting a zero-delay timer between chunks gives pending events a turn.

## Bad

```typescript
export function checksum(values: number[]): number {
  let total = 0;
  for (const value of values) {
    total = (total + Math.sqrt(value)) % 1_000_000;
  }
  return total;
}
```

## Good

```typescript
export async function checksum(values: number[]): Promise<number> {
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total = (total + Math.sqrt(values[index])) % 1_000_000;
    if (index % 1000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return total;
}
```

## See Also

- [typescript-perf-worker-offload](perf-worker-offload.md) - moving the work off the main thread entirely
- [typescript-conc-no-busy-wait](conc-no-busy-wait.md) - the waiting case, where blocking is fatal

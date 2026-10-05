---
id: typescript-perf-worker-offload
lang: typescript
prefix: perf
title: Run CPU-bound work in a worker so the main thread stays responsive
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [worker, main thread, CPU, responsiveness]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Worker]
related: [typescript-perf-measure-first, typescript-async-no-misused-promises]
sources:
  - title: MDN - Worker
    url: https://developer.mozilla.org/en-US/docs/Web/API/Worker
---
> Run CPU-bound work in a worker so the main thread can keep responding to input.

## Why

JavaScript on the main thread runs to completion, so a long computation blocks input handling, rendering, and timers until it finishes. A worker is a background task that receives messages and runs the computation on another thread, which keeps the main thread free to respond.

## Bad

```typescript
function hashAll(blocks: string[]): number {
  let total = 0;
  for (const block of blocks) {
    total += block.length ** 2;
  }
  return total;
}
```

## Good

```typescript
const worker = new Worker("./hash-worker.js");

function hashAll(blocks: string[]): void {
  worker.postMessage(blocks);
}
```

## See Also

- [typescript-perf-measure-first](perf-measure-first.md) - confirming the work is long enough to offload
- [typescript-async-no-misused-promises](async-no-misused-promises.md) - handling the worker's async reply

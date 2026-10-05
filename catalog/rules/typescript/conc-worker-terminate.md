---
id: typescript-conc-worker-terminate
lang: typescript
prefix: conc
title: Terminate workers when their work is done
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [worker, terminate, cleanup]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Worker]
related: [typescript-conc-worker-errors, typescript-perf-worker-offload]
sources:
  - title: MDN - Worker
    url: https://developer.mozilla.org/en-US/docs/Web/API/Worker
---
> Call `terminate` when a worker's task finishes so its thread and memory are released.

## Why

A worker keeps its thread and its copy of the module graph alive until it is terminated, so a program that creates workers per task accumulates them. Terminating on the final message returns the resources when the work ends.

## Bad

```typescript
export function runOnce(worker: Worker, data: number[]): void {
  worker.postMessage(data);
}
```

## Good

```typescript
export function runOnce(worker: Worker, data: number[]): void {
  worker.addEventListener("message", () => {
    worker.terminate();
  });
  worker.postMessage(data);
}
```

## See Also

- [typescript-conc-worker-errors](conc-worker-errors.md) - catching the crash before cleanup runs
- [typescript-perf-worker-offload](perf-worker-offload.md) - deciding what belongs in a worker

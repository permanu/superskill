---
id: typescript-conc-transfer-buffers
lang: typescript
prefix: conc
title: Transfer buffers to a worker instead of copying them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [transferable, worker, buffer]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [postMessage]
related: [typescript-perf-worker-offload, typescript-conc-structured-clone-worker]
sources:
  - title: MDN - Web Workers API - Transferable objects
    url: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
---
> Pass large buffers in the worker's transfer list so ownership moves without a structured-clone copy.

## Why

Without a transfer list, `postMessage` copies the buffer through structured clone, doubling memory and time for large payloads. Listing it as transferable moves the resource to the worker; the sending side's reference is detached and must not be used again.

## Bad

```typescript
export function send(worker: Worker, buffer: ArrayBuffer): void {
  worker.postMessage(buffer);
}
```

## Good

```typescript
export function send(worker: Worker, buffer: ArrayBuffer): void {
  worker.postMessage(buffer, [buffer]);
}
```

## See Also

- [typescript-perf-worker-offload](perf-worker-offload.md) - moving CPU-bound work to a worker
- [typescript-conc-structured-clone-worker](conc-structured-clone-worker.md) - what else the clone does to messages

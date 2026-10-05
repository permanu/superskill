---
id: typescript-conc-worker-errors
lang: typescript
prefix: conc
title: Handle worker errors where the work starts
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [worker error, error event, crash]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Worker]
related: [typescript-conc-worker-terminate, typescript-err-no-swallow]
sources:
  - title: MDN - Worker
    url: https://developer.mozilla.org/en-US/docs/Web/API/Worker
---
> Attach an error listener when starting a worker so a crash is reported against the task that spawned it.

## Why

An uncaught error inside a worker is reported as an error event on the worker object rather than through the message channel, and the worker survives to process later messages. Without a listener the failure is invisible to the caller, which cannot tell a crashed task from a slow one. Listening at the start routes the error to the code that posted the work.

## Bad

```typescript
export function start(worker: Worker): void {
  worker.postMessage("start");
}
```

## Good

```typescript
export function start(worker: Worker): void {
  worker.addEventListener("error", (event) => {
    console.error(event.message);
  });
  worker.postMessage("start");
}
```

## See Also

- [typescript-conc-worker-terminate](conc-worker-terminate.md) - releasing the worker when the work ends
- [typescript-err-no-swallow](err-no-swallow.md) - handling a failure rather than dropping it

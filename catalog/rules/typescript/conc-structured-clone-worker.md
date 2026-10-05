---
id: typescript-conc-structured-clone-worker
lang: typescript
prefix: conc
title: Send plain data to workers, not class instances
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [structured clone, worker, message]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [postMessage]
related: [typescript-conc-transfer-buffers, typescript-perf-structured-clone]
sources:
  - title: MDN - Structured clone algorithm
    url: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
---
> Post plain objects to a worker; structured clone drops methods and accessors from class instances.

## Why

`postMessage` runs the structured clone algorithm, which copies data properties but not property descriptors, setters, getters, or functions, so a class instance arrives as a plain object with its behavior missing. Sending an explicit data shape keeps both sides on the same contract.

## Bad

```typescript
export class Task {
  constructor(public id: string) {}

  label(): string {
    return `task ${this.id}`;
  }
}

export function send(worker: Worker, task: Task): void {
  worker.postMessage(task);
}
```

## Good

```typescript
export interface TaskMessage {
  id: string;
}

export function send(worker: Worker, task: TaskMessage): void {
  worker.postMessage({ id: task.id });
}
```

## See Also

- [typescript-conc-transfer-buffers](conc-transfer-buffers.md) - moving the buffers the message carries
- [typescript-perf-structured-clone](perf-structured-clone.md) - the same algorithm used for local cloning

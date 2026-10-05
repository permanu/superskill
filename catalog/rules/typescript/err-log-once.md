---
id: typescript-err-log-once
lang: typescript
prefix: err
title: Log a failure once, where it is handled; propagate it elsewhere
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, rethrow, handler, noise]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [console.error]
related: [typescript-err-wrap-with-cause, typescript-err-no-swallow]
sources:
  - title: Node.js - Errors (Error propagation and interception)
    url: https://nodejs.org/api/errors.html
  - title: typescript-eslint - only-throw-error (rethrow guidance)
    url: https://typescript-eslint.io/rules/only-throw-error/
---
> Log each failure once at the layer that handles it; elsewhere add context and propagate.

## Why

Catching only to log and rethrow adds no information and produces one duplicate log per layer, which buries the layer that actually handles the failure. Propagation is the default; a layer that can act or add context does so and lets the error continue.

## Bad

```typescript
declare function readFile(path: string): string;

function load(path: string): string {
  try {
    return readFile(path);
  } catch (e) {
    console.error("load failed", e);
    throw e;
  }
}

function run(path: string): string {
  try {
    return load(path);
  } catch (e) {
    console.error("run failed", e);
    throw e;
  }
}
```

## Good

```typescript
declare function readFile(path: string): string;

function load(path: string): string {
  try {
    return readFile(path);
  } catch (e) {
    throw new Error(`cannot load ${path}`, { cause: e });
  }
}

function run(path: string): void {
  try {
    load(path);
  } catch (e) {
    console.error("run failed", e);
  }
}
```

## See Also

- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - adding context without discarding the original error
- [typescript-err-no-swallow](err-no-swallow.md) - the opposite failure mode, dropping the error entirely

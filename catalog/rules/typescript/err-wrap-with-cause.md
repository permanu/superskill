---
id: typescript-err-wrap-with-cause
lang: typescript
prefix: err
title: Wrap caught errors with cause instead of replacing or stringifying them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cause, wrap, rethrow, error chain]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error, cause]
related: [typescript-err-log-once, typescript-err-catch-unknown]
sources:
  - title: "MDN - Error: cause"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
  - title: Node.js - Errors (error.cause)
    url: https://nodejs.org/api/errors.html
---
> Wrap a caught error with `cause` so context is added without discarding the original failure.

## Why

Copying `e.message` into a new error destroys the original stack, type, and structured data, and turns a chain of failures into a single string. The `cause` option keeps the original error reachable for handlers, logs, and serializers while the wrapper names the operation that failed.

## Bad

```typescript
declare function readFile(path: string): string;

function loadConfig(path: string): string {
  try {
    return readFile(path);
  } catch (e) {
    throw new Error(`failed to load config: ${(e as Error).message}`);
  }
}
```

## Good

```typescript
declare function readFile(path: string): string;

function loadConfig(path: string): string {
  try {
    return readFile(path);
  } catch (e) {
    throw new Error("failed to load config", { cause: e });
  }
}
```

## See Also

- [typescript-err-log-once](err-log-once.md) - why the wrapper propagates instead of logging and rethrowing
- [typescript-err-catch-unknown](err-catch-unknown.md) - treating the caught value as unknown before wrapping it

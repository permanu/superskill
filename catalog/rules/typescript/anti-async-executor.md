---
id: typescript-anti-async-executor
lang: typescript
prefix: anti
title: Never pass an async function to the Promise constructor
severity: must
enforce: tool
tool: "eslint:no-async-promise-executor"
baseline: latest
status: verified
triggers:
  keywords: [Promise executor, async, unhandled rejection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise]
related: [typescript-async-promise-constructor]
sources:
  - title: ESLint - no-async-promise-executor
    url: https://eslint.org/docs/latest/rules/no-async-promise-executor/
  - title: MDN - Promise() constructor
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/Promise
---
> Pass a synchronous executor to `new Promise`; never mark the executor `async`.

## Why

An async executor returns a promise of its own that the constructor ignores, so a rejection inside it becomes an unhandled rejection instead of rejecting the new promise, and the promise can hang when the executor throws. Awaiting work belongs in the async function that returns the promise.

## Bad

```typescript
export function load(): Promise<string> {
  return new Promise<string>(async (resolve) => {
    resolve("value");
  });
}
```

## Good

```typescript
export async function load(): Promise<string> {
  return "value";
}
```

## See Also

- [typescript-async-promise-constructor](async-promise-constructor.md) - wrapping a callback API in one promise helper

---
id: typescript-async-await-thenable
lang: typescript
prefix: async
title: Await only thenables so every await point is real
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/await-thenable"
baseline: latest
status: verified
triggers:
  keywords: [await, thenable, promise, microtask]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [await, Promise]
related: [typescript-err-async-propagate, typescript-async-return-await]
sources:
  - title: typescript-eslint - await-thenable
    url: https://typescript-eslint.io/rules/await-thenable/
  - title: MDN - Using promises (chaining)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Await only promises; awaiting a plain value still pauses a microtask and hides a missing call.

## Why

`await` on a non-thenable resolves immediately but still suspends the function until the next microtask, so the code looks asynchronous while nothing was awaited. The usual cause is a forgotten call on a function that returns a promise, which the plain-value await conceals.

## Bad

```typescript
async function readConfig(): Promise<string> {
  return await "config";
}
```

## Good

```typescript
async function readConfig(): Promise<string> {
  return "config";
}
```

## See Also

- [typescript-err-async-propagate](err-async-propagate.md) - keeping real rejections attached to a handler
- [typescript-async-return-await](async-return-await.md) - where an await on a promise belongs

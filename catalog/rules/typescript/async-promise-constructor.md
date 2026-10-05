---
id: typescript-async-promise-constructor
lang: typescript
prefix: async
title: Wrap a callback API in one promise helper, then use async functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [new Promise, resolve, callback, promisify]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise]
related: [typescript-async-no-misused-promises, typescript-err-async-propagate]
sources:
  - title: MDN - Using promises (creating a Promise around a callback API)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
  - title: MDN - Promise
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
---
> Wrap a callback API in one promise-returning helper; express the rest with async functions.

## Why

The `Promise` constructor is the tool for adapting a callback API that has no promise form. Building ordinary control flow inside an executor hides rejections from the surrounding `try`/`catch` and duplicates wrapping logic at every call site, while an async function composes with the rest of the async code.

## Bad

```typescript
function load(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("data"), 100);
  });
}
```

## Good

```typescript
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function load(): Promise<string> {
  await wait(100);
  return "data";
}
```

## See Also

- [typescript-async-no-misused-promises](async-no-misused-promises.md) - promises hidden inside void callbacks
- [typescript-err-async-propagate](err-async-propagate.md) - rejections that must reach a handler

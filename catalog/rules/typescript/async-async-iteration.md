---
id: typescript-async-async-iteration
lang: typescript
prefix: async
title: Consume async iterables with for await...of
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [for await, async iterable, stream, iterator]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AsyncIterable, Symbol.asyncIterator]
related: [typescript-async-no-misused-promises, typescript-err-async-propagate]
sources:
  - title: MDN - for await...of
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
  - title: typescript-eslint - await-thenable (async iteration)
    url: https://typescript-eslint.io/rules/await-thenable/
---
> Consume async iterables with `for await...of` so the loop handles `next()` and cleanup.

## Why

A manual iterator loop has to call `next()`, unwrap the result, and remember the completion protocol by hand; an early exit or a thrown error skips the iterator's `return()` cleanup. `for await...of` performs the protocol, awaits each value, and closes the iterator on every exit path.

## Bad

```typescript
async function sum(iterable: AsyncIterable<number>): Promise<number> {
  let total = 0;
  const iterator = iterable[Symbol.asyncIterator]();
  let step = await iterator.next();
  while (!step.done) {
    total += step.value;
    step = await iterator.next();
  }
  return total;
}
```

## Good

```typescript
async function sum(iterable: AsyncIterable<number>): Promise<number> {
  let total = 0;
  for await (const value of iterable) {
    total += value;
  }
  return total;
}
```

## See Also

- [typescript-async-no-misused-promises](async-no-misused-promises.md) - sequential async work driven by the wrong construct
- [typescript-err-async-propagate](err-async-propagate.md) - rejections from the iterable reaching a handler

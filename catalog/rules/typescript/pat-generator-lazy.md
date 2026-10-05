---
id: typescript-pat-generator-lazy
lang: typescript
prefix: pat
title: Produce sequences lazily with generators
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generator, lazy, sequence]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [function*]
related: [typescript-pat-custom-iterable, typescript-perf-early-exit]
sources:
  - title: TypeScript Handbook - Iterators and Generators
    url: https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html
  - title: MDN - Iteration protocols
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
---
> Return a generator when callers consume a sequence incrementally instead of materializing every value first.

## Why

The array version computes and stores the whole sequence before the caller sees the first value, even when the loop stops early; a generator computes each value on demand and composes with `for...of` and other iterators.

## Bad

```typescript
export function squares(limit: number): number[] {
  const result: number[] = [];
  for (let value = 1; value <= limit; value += 1) {
    result.push(value * value);
  }
  return result;
}
```

## Good

```typescript
export function* squares(limit: number): Generator<number> {
  for (let value = 1; value <= limit; value += 1) {
    yield value * value;
  }
}
```

## See Also

- [typescript-pat-custom-iterable](pat-custom-iterable.md) - making an object itself iterable
- [typescript-perf-early-exit](perf-early-exit.md) - stopping a scan as soon as the answer is known

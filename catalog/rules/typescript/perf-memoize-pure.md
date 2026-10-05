---
id: typescript-perf-memoize-pure
lang: typescript
prefix: perf
title: Cache a pure function's result in a Map when inputs recur
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [memoize, cache, Map, pure]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Map]
related: [typescript-perf-regexp-hoist, typescript-perf-measure-first]
sources:
  - title: MDN - Map (key equality and performance)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
---
> Cache a pure function's result in a `Map` when the same inputs recur.

## Why

A pure function computes the same answer for the same input every time, so repeating an expensive call is wasted work. A `Map` keyed by the input gives an average sublinear lookup, and caching is only safe when the function has no observable side effects and the input set is bounded.

## Bad

```typescript
function expensive(input: number): number {
  let total = 0;
  for (let i = 0; i < input; i += 1) {
    total += Math.sqrt(i);
  }
  return total;
}
```

## Good

```typescript
const cache = new Map<number, number>();

function expensive(input: number): number {
  const cached = cache.get(input);
  if (cached !== undefined) {
    return cached;
  }
  let total = 0;
  for (let i = 0; i < input; i += 1) {
    total += Math.sqrt(i);
  }
  cache.set(input, total);
  return total;
}
```

## See Also

- [typescript-perf-regexp-hoist](perf-regexp-hoist.md) - precomputing a value instead of caching by input
- [typescript-perf-measure-first](perf-measure-first.md) - proving the call is expensive first

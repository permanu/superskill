---
id: typescript-api-iterable-params
lang: typescript
prefix: api
title: Accept Iterable when you only iterate
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Iterable, array, parameter, generator]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Iterable]
related: [typescript-type-readonly-inputs, typescript-perf-early-exit]
sources:
  - title: TypeScript Handbook - Iterators and Generators (Iterable interface)
    url: https://www.typescriptlang.org/docs/handbook/iterators-and-generators.html
  - title: TypeScript Handbook - Object Types (ReadonlyArray)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Accept `Iterable<T>` when you only iterate, so callers can pass sets and generators.

## Why

An array parameter forces callers holding a `Set`, a generator, or any other iterable to materialize an array first, which copies data and can be impossible for infinite sequences. The `Iterable` interface names the capability the function actually needs and accepts every built-in iterable.

## Bad

```typescript
export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
```

## Good

```typescript
export function total(values: Iterable<number>): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum;
}
```

## See Also

- [typescript-type-readonly-inputs](type-readonly-inputs.md) - the read-only contract for inputs
- [typescript-perf-early-exit](perf-early-exit.md) - stopping an iteration early

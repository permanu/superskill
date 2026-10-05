---
id: typescript-pat-reduce-initial-value
lang: typescript
prefix: pat
title: Pass the initial value to reduce
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reduce, accumulator, initial value]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [reduce]
related: [typescript-perf-early-exit, typescript-pat-filter-not-splice]
sources:
  - title: MDN - Array.prototype.reduce
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
---
> Always pass an initial value to `reduce` so the accumulator type and empty-input behavior are defined.

## Why

Without an initial value, `reduce` uses the first element as the accumulator, which changes the accumulator's type and throws on an empty array. The explicit seed keeps the result well-defined for every input.

## Bad

```typescript
export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value);
}
```

## Good

```typescript
export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
```

## See Also

- [typescript-perf-early-exit](perf-early-exit.md) - choosing the array method that stops when it can
- [typescript-pat-filter-not-splice](pat-filter-not-splice.md) - the other array method that replaces a manual loop

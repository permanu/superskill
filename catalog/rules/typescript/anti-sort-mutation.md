---
id: typescript-anti-sort-mutation
lang: typescript
prefix: anti
title: Copy an array before sorting it in place
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sort, mutation, in place]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [sort]
related: [typescript-perf-sort-comparator]
sources:
  - title: MDN - Array.prototype.sort
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
---
> Sort a copy of a caller's array; `sort` reorders the array in place and returns it.

## Why

`sort` reorders the array it is called on, so a helper that returns `values.sort(...)` also changes the caller's array as a hidden side effect. Spreading into a copy keeps the ordering local to the helper and leaves the argument untouched.

## Bad

```typescript
export function sorted(values: number[]): number[] {
  return values.sort((a, b) => a - b);
}
```

## Good

```typescript
export function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}
```

## See Also

- [typescript-perf-sort-comparator](perf-sort-comparator.md) - the comparator this copy is passed to

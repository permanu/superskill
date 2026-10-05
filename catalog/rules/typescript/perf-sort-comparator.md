---
id: typescript-perf-sort-comparator
lang: typescript
prefix: perf
title: Pass an explicit comparator to sort
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sort, comparator, order, numbers]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [sort]
related: [typescript-perf-early-exit]
sources:
  - title: MDN - Array.prototype.sort()
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
---
> Pass an explicit comparator to `sort`; the default compares string representations.

## Why

Without a comparator, `sort` converts every element to a string and compares UTF-16 code units, so `[1, 30, 4, 21, 100000]` sorts as `[1, 100000, 21, 30, 4]`. The comparator also avoids the string conversion and its allocations in the comparison loop.

## Bad

```typescript
function ascending(values: number[]): number[] {
  return values.sort();
}
```

## Good

```typescript
function ascending(values: number[]): number[] {
  return values.sort((a, b) => a - b);
}
```

## See Also

- [typescript-perf-early-exit](perf-early-exit.md) - another case where the default method hides its cost

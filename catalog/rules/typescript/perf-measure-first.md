---
id: typescript-perf-measure-first
lang: typescript
prefix: perf
title: Measure a hot path with performance.now before optimizing it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [measure, performance.now, profile, benchmark]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [performance.now]
related: [typescript-perf-memoize-pure, typescript-perf-set-membership]
sources:
  - title: "MDN - Performance: now() method"
    url: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
---
> Measure a hot path with `performance.now`, which is monotonic and sub-millisecond, before optimizing it.

## Why

Optimization without measurement spends complexity on code that is not the bottleneck, and `Date.now` is too coarse and too subject to clock adjustments for short measurements. `performance.now` is relative to a monotonic clock with sub-millisecond resolution, so a before-and-after pair shows whether a change actually moved the cost.

## Bad

```typescript
function measure(work: () => void): number {
  const start = Date.now();
  work();
  return Date.now() - start;
}
```

## Good

```typescript
function measure(work: () => void): number {
  const start = performance.now();
  work();
  return performance.now() - start;
}
```

## See Also

- [typescript-perf-memoize-pure](perf-memoize-pure.md) - a change worth measuring
- [typescript-perf-set-membership](perf-set-membership.md) - another change worth measuring

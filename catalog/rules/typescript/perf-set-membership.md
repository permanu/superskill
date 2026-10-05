---
id: typescript-perf-set-membership
lang: typescript
prefix: perf
title: Look up membership in a Set instead of scanning an array
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Set, includes, membership, lookup]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Set, includes]
related: [typescript-perf-early-exit, typescript-perf-map-churn]
sources:
  - title: MDN - Set (performance)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
---
> Look up membership in a `Set` instead of scanning an array on every check.

## Why

`Array.prototype.includes` walks the array until it finds the value, so a membership test inside another loop turns the work quadratic. A `Set` performs an average sublinear lookup, and MDN documents `has` as faster on average than `includes` for a collection of the same size.

## Bad

```typescript
function commonIds(a: string[], b: string[]): string[] {
  return a.filter((id) => b.includes(id));
}
```

## Good

```typescript
function commonIds(a: string[], b: string[]): string[] {
  const known = new Set(b);
  return a.filter((id) => known.has(id));
}
```

## See Also

- [typescript-perf-early-exit](perf-early-exit.md) - the single-scan version of a membership test
- [typescript-perf-map-churn](perf-map-churn.md) - the key-value form of the same structure

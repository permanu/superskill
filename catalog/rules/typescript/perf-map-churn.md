---
id: typescript-perf-map-churn
lang: typescript
prefix: perf
title: Use a Map for key sets that change frequently
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Map, object, keys, dictionary]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Map, Record]
related: [typescript-perf-set-membership, typescript-perf-memoize-pure]
sources:
  - title: MDN - Map (objects vs. maps)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
---
> Use a `Map` for key sets that change frequently; plain objects are not optimized for churn.

## Why

MDN documents that `Map` performs better in scenarios involving frequent additions and removals of key-value pairs, while objects are not optimized for that churn. A `Map` also has no prototype keys that can collide with data keys and exposes its size directly.

## Bad

```typescript
function trackCounts(events: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event] = (counts[event] ?? 0) + 1;
  }
  return counts;
}
```

## Good

```typescript
function trackCounts(events: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event, (counts.get(event) ?? 0) + 1);
  }
  return counts;
}
```

## See Also

- [typescript-perf-set-membership](perf-set-membership.md) - the membership-only form of the structure
- [typescript-perf-memoize-pure](perf-memoize-pure.md) - a Map used as a result cache

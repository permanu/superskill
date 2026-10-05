---
id: typescript-mem-weakset-membership
lang: typescript
prefix: mem
title: Track object membership with a WeakSet
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WeakSet, membership, garbage collection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [WeakSet]
related: [typescript-mem-weak-cache, typescript-mem-bounded-cache]
sources:
  - title: MDN - WeakSet
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet
---
> Record visited or seen objects in a WeakSet so the tracker does not keep them alive.

## Why

A Set of objects holds them strongly, so a tracker that outlives the objects keeps the whole graph in memory. A WeakSet holds its members weakly and exists only for membership tests, which is exactly what "seen" means.

## Bad

```typescript
const visited = new Set<object>();

export function seen(target: object): boolean {
  if (visited.has(target)) {
    return true;
  }
  visited.add(target);
  return false;
}
```

## Good

```typescript
const visited = new WeakSet<object>();

export function seen(target: object): boolean {
  if (visited.has(target)) {
    return true;
  }
  visited.add(target);
  return false;
}
```

## See Also

- [typescript-mem-weak-cache](mem-weak-cache.md) - the keyed form for per-object data
- [typescript-mem-bounded-cache](mem-bounded-cache.md) - bounding collections that must stay enumerable

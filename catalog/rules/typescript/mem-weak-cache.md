---
id: typescript-mem-weak-cache
lang: typescript
prefix: mem
title: Cache per-object data in a WeakMap
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [WeakMap, cache, garbage collection]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [WeakMap]
related: [typescript-mem-weakset-membership, typescript-perf-memoize-pure]
sources:
  - title: MDN - WeakMap
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
---
> Attach metadata to objects with a WeakMap so entries disappear when the object is collected.

## Why

A Map entry holds its key strongly, so per-object metadata in a Map keeps every object alive for the life of the cache. A WeakMap holds the key weakly: when nothing else references the object, the entry is collected with it.

## Bad

```typescript
const sizes = new Map<object, number>();

export function record(target: object, size: number): void {
  sizes.set(target, size);
}
```

## Good

```typescript
const sizes = new WeakMap<object, number>();

export function record(target: object, size: number): void {
  sizes.set(target, size);
}
```

## See Also

- [typescript-mem-weakset-membership](mem-weakset-membership.md) - the membership-only form of the same idea
- [typescript-perf-memoize-pure](perf-memoize-pure.md) - caching by value for pure functions

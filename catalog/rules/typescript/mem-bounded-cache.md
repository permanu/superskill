---
id: typescript-mem-bounded-cache
lang: typescript
prefix: mem
title: Bound the size of long-lived caches
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cache, eviction, Map]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Map]
related: [typescript-mem-weak-cache, typescript-perf-memoize-pure]
sources:
  - title: MDN - Map
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
---
> Evict the oldest entry when a Map cache reaches its limit.

## Why

An unbounded cache grows with every distinct key and never releases memory. Map preserves insertion order, so deleting the first key keeps the cache at a fixed size with the entries that were added longest ago.

## Bad

```typescript
const cache = new Map<string, string>();

export function cached(key: string, load: () => string): string {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const value = load();
  cache.set(key, value);
  return value;
}
```

## Good

```typescript
const cache = new Map<string, string>();
const LIMIT = 100;

export function cached(key: string, load: () => string): string {
  const hit = cache.get(key);
  if (hit !== undefined) {
    return hit;
  }
  const value = load();
  if (cache.size >= LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, value);
  return value;
}
```

## See Also

- [typescript-mem-weak-cache](mem-weak-cache.md) - when the cache can key on objects instead
- [typescript-perf-memoize-pure](perf-memoize-pure.md) - the cache this bound applies to

---
id: typescript-perf-structured-clone
lang: typescript
prefix: perf
title: Clone with structuredClone instead of a JSON round-trip
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clone, structuredClone, JSON, deep copy]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [structuredClone, JSON]
related: [typescript-perf-measure-first]
sources:
  - title: MDN - structuredClone()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone
---
> Clone with `structuredClone`; a JSON round-trip drops types and rejects on circular data.

## Why

`JSON.stringify` converts dates to strings, maps to empty objects, and `undefined` values to missing keys, and it throws on circular references, so a round-trip is both lossy and fragile. `structuredClone` performs a real deep clone of supported types and preserves circular references in one call.

## Bad

```typescript
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
```

## Good

```typescript
function clone<T>(value: T): T {
  return structuredClone(value);
}
```

## See Also

- [typescript-perf-measure-first](perf-measure-first.md) - comparing clone cost when the input is large

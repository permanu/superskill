---
id: typescript-pat-for-of-map
lang: typescript
prefix: pat
title: Iterate maps with for...of, not forEach
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Map, for...of, iteration]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-pat-iterator-consumer, typescript-perf-map-churn]
sources:
  - title: MDN - Map
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  - title: MDN - Iteration protocols
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
---
> Iterate a Map with `for...of` so each entry arrives as a key/value pair and the loop can stop.

## Why

The `for...of` form destructures entries, preserves the map's insertion order, and supports `break`, `continue`, and `await`; a `forEach` callback can express none of those and hides the iteration inside a closure.

## Bad

```typescript
export function joined(lookup: Map<string, number>): string {
  let result = "";
  lookup.forEach((value, key) => {
    result += `${key}:${value};`;
  });
  return result;
}
```

## Good

```typescript
export function joined(lookup: Map<string, number>): string {
  let result = "";
  for (const [key, value] of lookup) {
    result += `${key}:${value};`;
  }
  return result;
}
```

## See Also

- [typescript-pat-iterator-consumer](pat-iterator-consumer.md) - the general form of consuming an iterable
- [typescript-perf-map-churn](perf-map-churn.md) - choosing a Map for keyed data in the first place

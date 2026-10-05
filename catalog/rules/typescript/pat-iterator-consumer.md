---
id: typescript-pat-iterator-consumer
lang: typescript
prefix: pat
title: Consume iterables with for...of, not manual next calls
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [for...of, iterator, next]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-pat-custom-iterable, typescript-pat-for-of-map]
sources:
  - title: MDN - Iteration protocols
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
---
> Read an iterable with `for...of` instead of calling `next` by hand.

## Why

Manual `next` calls re-implement the done/value protocol and skip the iterator's cleanup hook when the loop exits early; the loop syntax handles both and works unchanged with async iterables.

## Bad

```typescript
export function first(values: Iterable<number>): number | undefined {
  const iterator = values[Symbol.iterator]();
  const result = iterator.next();
  return result.done ? undefined : result.value;
}
```

## Good

```typescript
export function first(values: Iterable<number>): number | undefined {
  for (const value of values) {
    return value;
  }
  return undefined;
}
```

## See Also

- [typescript-pat-custom-iterable](pat-custom-iterable.md) - implementing the protocol on a custom type
- [typescript-pat-for-of-map](pat-for-of-map.md) - the same loop over map entries

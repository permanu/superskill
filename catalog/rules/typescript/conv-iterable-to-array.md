---
id: typescript-conv-iterable-to-array
lang: typescript
prefix: conv
title: Convert iterables with Array.from
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Array.from, iterable, Set]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Array.from]
related: [typescript-conv-string-explicit, typescript-anti-arguments-object]
sources:
  - title: MDN - Array.from
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from
---
> Materialize an iterable with `Array.from` instead of pushing its items into a growing array.

## Why

`Array.from` creates a shallow copy from any iterable in one expression; the loop version declares a mutable accumulator and repeats the iteration machinery at every call site. Fewer moving parts also means fewer places to get the types wrong.

## Bad

```typescript
export function toArray(values: Set<string>): string[] {
  const result: string[] = [];
  values.forEach((value) => {
    result.push(value);
  });
  return result;
}
```

## Good

```typescript
export function toArray(values: Set<string>): string[] {
  return Array.from(values);
}
```

## See Also

- [typescript-conv-string-explicit](conv-string-explicit.md) - the other explicit-conversion helper
- [typescript-anti-arguments-object](anti-arguments-object.md) - replacing array-like objects with real arrays

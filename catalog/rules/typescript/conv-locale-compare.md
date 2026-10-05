---
id: typescript-conv-locale-compare
lang: typescript
prefix: conv
title: Sort user-visible strings with localeCompare
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [localeCompare, sorting, collation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [localeCompare]
related: [typescript-perf-sort-comparator, typescript-data-unicode-normalize]
sources:
  - title: MDN - String.prototype.localeCompare
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
---
> Compare display text with `localeCompare` instead of the relational operators.

## Why

`<` and `>` compare UTF-16 code units, which orders uppercase before lowercase and ignores the locale's collation rules, so a sorted list looks wrong to the reader. `localeCompare` returns the ordering the locale defines.

## Bad

```typescript
export function byName(names: string[]): string[] {
  return [...names].sort((first, second) => (first < second ? -1 : 1));
}
```

## Good

```typescript
export function byName(names: string[]): string[] {
  return [...names].sort((first, second) => first.localeCompare(second));
}
```

## See Also

- [typescript-perf-sort-comparator](perf-sort-comparator.md) - passing an explicit comparator to sort
- [typescript-data-unicode-normalize](data-unicode-normalize.md) - normalizing the text before comparing it

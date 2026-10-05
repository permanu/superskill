---
id: typescript-pat-filter-not-splice
lang: typescript
prefix: pat
title: Build filtered arrays instead of splicing while iterating
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [filter, splice, iteration]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [filter]
related: [typescript-anti-array-delete, typescript-pat-generator-lazy]
sources:
  - title: MDN - Array.prototype.filter
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
---
> Produce the filtered array with `filter` instead of removing elements while a loop is running.

## Why

Removing an element shifts every later element down one index, so a loop that advances its own index skips the element that slid into the vacated slot. Building a new array leaves the input untouched and visits every element exactly once.

## Bad

```typescript
export function withoutShort(words: string[]): void {
  for (let index = 0; index < words.length; index += 1) {
    if (words[index].length < 3) {
      words.splice(index, 1);
    }
  }
}
```

## Good

```typescript
export function withoutShort(words: string[]): string[] {
  return words.filter((word) => word.length >= 3);
}
```

## See Also

- [typescript-anti-array-delete](anti-array-delete.md) - the other array-removal mistake
- [typescript-pat-generator-lazy](pat-generator-lazy.md) - producing a sequence without an intermediate array

---
id: typescript-anti-array-delete
lang: typescript
prefix: anti
title: Remove array elements with splice, not delete
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-array-delete"
baseline: latest
status: verified
triggers:
  keywords: [delete, sparse array, splice]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [delete]
related: [typescript-anti-sort-mutation]
sources:
  - title: typescript-eslint - no-array-delete
    url: https://typescript-eslint.io/rules/no-array-delete/
  - title: MDN - delete
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
---
> Remove array elements with `splice` instead of `delete`, which leaves a hole and keeps the old length.

## Why

`delete` removes the property but not the slot: the array keeps its length, the index reads as `undefined`, and every later iteration sees the hole. `splice` removes the element and shifts the rest, so the array stays dense and its length matches its contents.

## Bad

```typescript
export function removeFirst(values: string[]): string[] {
  delete values[0];
  return values;
}
```

## Good

```typescript
export function removeFirst(values: string[]): string[] {
  values.splice(0, 1);
  return values;
}
```

## See Also

- [typescript-anti-sort-mutation](anti-sort-mutation.md) - the other in-place array operation with surprising reach

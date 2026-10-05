---
id: typescript-anti-array-constructor
lang: typescript
prefix: anti
title: Create arrays with literals instead of the Array constructor
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-array-constructor"
baseline: latest
status: verified
triggers:
  keywords: [new Array, sparse array, Array.from]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Array]
related: [typescript-anti-array-delete]
sources:
  - title: typescript-eslint - no-array-constructor
    url: https://typescript-eslint.io/rules/no-array-constructor/
  - title: MDN - Array() constructor
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Array
---
> Create arrays with literals instead of the `Array` constructor.

## Why

`new Array(1, 2, 3)` and `new Array()` wrap a literal in a constructor call, and the multi-argument form is easy to misread as a length. The lint rule rejects those constructor calls; the single-argument length form is left alone because it has no literal equivalent.

## Bad

```typescript
export function values(): number[] {
  return new Array(1, 2, 3);
}
```

## Good

```typescript
export function values(): number[] {
  return [1, 2, 3];
}
```

## See Also

- [typescript-anti-array-delete](anti-array-delete.md) - the other array habit that surprises the reader

---
id: typescript-conv-integer-check
lang: typescript
prefix: conv
title: Test whole numbers with Number.isInteger
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Number.isInteger, whole number, validation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.isInteger]
related: [typescript-conv-number-validate, typescript-conv-number-explicit]
sources:
  - title: MDN - Number.isInteger
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
---
> Ask `Number.isInteger` instead of comparing a value to its floor.

## Why

The floor comparison reads as arithmetic and accepts `Infinity`, which equals its own floor; `Number.isInteger` answers the actual question and rejects non-finite values. The name also says why the check exists.

## Bad

```typescript
export function isCount(value: number): boolean {
  return value === Math.floor(value);
}
```

## Good

```typescript
export function isCount(value: number): boolean {
  return Number.isInteger(value);
}
```

## See Also

- [typescript-conv-number-validate](conv-number-validate.md) - validating the conversion before the integer check
- [typescript-conv-number-explicit](conv-number-explicit.md) - producing the number in the first place

---
id: typescript-num-nan-test
lang: typescript
prefix: num
title: Test NaN with Number.isNaN, not global isNaN
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [NaN, Number.isNaN, coercion]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.isNaN]
related: [typescript-conv-number-validate, typescript-data-json-non-finite]
sources:
  - title: MDN - Number.isNaN
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
  - title: MDN - NaN
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN
---
> Use `Number.isNaN` so only an actual NaN value passes the test, not a value that merely coerces to one.

## Why

The global `isNaN` converts its argument to a number first, so a string like `"abc"` reports as NaN even though it is not one; `Number.isNaN` answers whether the value itself is the number NaN and returns false for every other type.

## Bad

```typescript
export function isMissing(value: unknown): boolean {
  return isNaN(value as number);
}
```

## Good

```typescript
export function isMissing(value: unknown): boolean {
  return Number.isNaN(value);
}
```

## See Also

- [typescript-conv-number-validate](conv-number-validate.md) - checking a conversion for NaN before use
- [typescript-data-json-non-finite](data-json-non-finite.md) - what NaN does to a serialized payload

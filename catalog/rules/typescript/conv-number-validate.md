---
id: typescript-conv-number-validate
lang: typescript
prefix: conv
title: Check Number's result before using it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Number, NaN, validation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number]
related: [typescript-conv-number-explicit, typescript-data-date-parse-check]
sources:
  - title: MDN - Number
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
---
> Test the result of `Number(value)` for `NaN` before it enters arithmetic.

## Why

`Number` reports an unconvertible value by returning `NaN`, so a caller that trusts the result spreads `NaN` through every later calculation. Checking once at the conversion keeps the failure at its source.

## Bad

```typescript
export function count(input: string): number {
  return Number(input);
}
```

## Good

```typescript
export function count(input: string): number {
  const value = Number(input);
  if (Number.isNaN(value)) {
    throw new Error("not a number");
  }
  return value;
}
```

## See Also

- [typescript-conv-number-explicit](conv-number-explicit.md) - the conversion this check follows
- [typescript-data-date-parse-check](data-date-parse-check.md) - the same check for parsed timestamps

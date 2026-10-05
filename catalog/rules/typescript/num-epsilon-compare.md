---
id: typescript-num-epsilon-compare
lang: typescript
prefix: num
title: Compare computed floats with a tolerance
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [epsilon, floating point, equality]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.EPSILON]
related: [typescript-num-money-minor-units, typescript-conv-number-validate]
sources:
  - title: MDN - Number.EPSILON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON
  - title: MDN - Numbers and dates
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_dates
---
> Compare computed floating-point values with a tolerance instead of exact equality.

## Why

Rounding inside floating-point operations means two computations of the same value can differ in the last bits, so `===` reports false for values a reader would call equal. Comparing the difference against a tolerance scaled to the values' magnitude states the precision the result actually has.

## Bad

```typescript
export function same(first: number, second: number): boolean {
  return first === second;
}
```

## Good

```typescript
export function same(first: number, second: number): boolean {
  const scale = Math.max(1, Math.abs(first), Math.abs(second));
  return Math.abs(first - second) <= Number.EPSILON * scale;
}
```

## See Also

- [typescript-num-money-minor-units](num-money-minor-units.md) - avoiding the inexactness for decimal amounts
- [typescript-conv-number-validate](conv-number-validate.md) - rejecting values that are not numbers at all

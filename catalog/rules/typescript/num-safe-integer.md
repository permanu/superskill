---
id: typescript-num-safe-integer
lang: typescript
prefix: num
title: Reject integers outside the safe range
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [safe integer, precision, identifiers]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Number.isSafeInteger]
related: [typescript-data-large-integers, typescript-conv-number-validate]
sources:
  - title: MDN - Number.isSafeInteger
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger
  - title: MDN - Numbers and dates
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_dates
---
> Validate identifiers and counters with `Number.isSafeInteger` before trusting their exactness.

## Why

Integers above 2^53 − 1 cannot all be represented, so two distinct values can become the same number and equality checks pass for different ids. `Number.isSafeInteger` rejects values the number type cannot keep exact.

## Bad

```typescript
export function parseId(input: string): number {
  return Number(input);
}
```

## Good

```typescript
export function parseId(input: string): number {
  const value = Number(input);
  if (!Number.isSafeInteger(value)) {
    throw new Error("id out of range");
  }
  return value;
}
```

## See Also

- [typescript-data-large-integers](data-large-integers.md) - carrying values beyond the range as strings
- [typescript-conv-number-validate](conv-number-validate.md) - the NaN check that comes before this one

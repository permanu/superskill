---
id: typescript-num-round-minor-units
lang: typescript
prefix: num
title: Round once when converting to minor units
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rounding, cents, Math.round]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Math.round]
related: [typescript-num-money-minor-units, typescript-conv-intl-number]
sources:
  - title: MDN - Math.round
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
  - title: MDN - Numbers and dates
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_dates
---
> Apply `Math.round` when a decimal amount becomes minor units so the stored value is a whole number.

## Why

Decimal amounts convert to binary floats slightly below the intended value, so `0.29 * 100` is `28.999999999999996` and later comparisons or formatting show the wrong cent. Rounding once at the conversion boundary keeps minor units integral.

## Bad

```typescript
export function cents(amount: number): number {
  return amount * 100;
}
```

## Good

```typescript
export function cents(amount: number): number {
  return Math.round(amount * 100);
}
```

## See Also

- [typescript-num-money-minor-units](num-money-minor-units.md) - storing the rounded result
- [typescript-conv-intl-number](conv-intl-number.md) - formatting the stored amount for display

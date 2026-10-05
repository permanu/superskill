---
id: typescript-num-money-minor-units
lang: typescript
prefix: num
title: Store money in integer minor units
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [money, precision, minor units]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-num-round-minor-units, typescript-data-large-integers]
sources:
  - title: MDN - Numbers and dates
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Numbers_and_dates
  - title: MDN - Number.EPSILON
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON
---
> Keep monetary amounts in integer minor units so decimal amounts never become inexact binary fractions.

## Why

JavaScript numbers are double-precision binary values, so amounts like 0.1 are already inexact and repeated arithmetic drifts; MDN's `Number.EPSILON` example shows `0.2 - 0.3 + 0.1` not equaling zero. Integer minor units keep the arithmetic exact, and the decimal point is applied only for display.

## Bad

```typescript
export interface Invoice {
  total: number;
}

export function formatTotal(invoice: Invoice): string {
  return invoice.total.toFixed(2);
}
```

## Good

```typescript
export interface Invoice {
  totalCents: number;
}

export function formatTotal(invoice: Invoice): string {
  return (invoice.totalCents / 100).toFixed(2);
}
```

## See Also

- [typescript-num-round-minor-units](num-round-minor-units.md) - rounding when a decimal amount becomes minor units
- [typescript-data-large-integers](data-large-integers.md) - the wire format for values beyond the safe integer range

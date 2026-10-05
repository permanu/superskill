---
id: typescript-conv-intl-number
lang: typescript
prefix: conv
title: Format numbers for display with Intl.NumberFormat
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Intl.NumberFormat, currency, formatting]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Intl.NumberFormat]
related: [typescript-conv-locale-compare]
sources:
  - title: MDN - Intl.NumberFormat
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
---
> Format user-visible numbers with `Intl.NumberFormat` instead of `toFixed` or manual padding.

## Why

`toFixed` emits a bare decimal string with no grouping, currency symbol, or locale rules, so display code re-implements formatting at every call site. `Intl.NumberFormat` applies the locale's conventions, including currency and percent styles.

## Bad

```typescript
export function price(cents: number): string {
  return (cents / 100).toFixed(2);
}
```

## Good

```typescript
export function price(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
```

## See Also

- [typescript-conv-locale-compare](conv-locale-compare.md) - the collation side of locale-aware text

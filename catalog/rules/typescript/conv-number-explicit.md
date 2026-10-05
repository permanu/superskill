---
id: typescript-conv-number-explicit
lang: typescript
prefix: conv
title: Convert to number with Number, not unary plus
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [number conversion, unary plus, Number]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-conv-parseint-radix, typescript-conv-number-validate]
sources:
  - title: MDN - Unary plus (+)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unary_plus
  - title: MDN - Number
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
---
> Call `Number(value)` when the intent is conversion; unary `+` reads as a sign and hides that a parse can fail.

## Why

`+value` performs a numeric conversion disguised as an arithmetic operator, so a reader can mistake it for a sign and overlook that the result can be `NaN`. The `Number(value)` call states what is happening at the point it happens.

## Bad

```typescript
export function count(input: string): number {
  return +input;
}
```

## Good

```typescript
export function count(input: string): number {
  return Number(input);
}
```

## See Also

- [typescript-conv-parseint-radix](conv-parseint-radix.md) - the parsing function that needs an explicit base
- [typescript-conv-number-validate](conv-number-validate.md) - checking the conversion result

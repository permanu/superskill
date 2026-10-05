---
id: typescript-num-parseint-decimal
lang: typescript
prefix: num
title: Read decimal amounts with Number, not parseInt
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parseInt, decimals, parsing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [parseInt]
related: [typescript-conv-parseint-radix, typescript-conv-number-validate]
sources:
  - title: MDN - parseInt
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
  - title: MDN - Number
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
---
> Read decimal amounts with `Number`, not `parseInt`.

## Why

`parseInt` stops at the first character it cannot read, so `"19.99"` becomes `19` and trailing text is ignored; `Number` reads the whole numeric literal and reports anything else as `NaN`.

## Bad

```typescript
export function amount(input: string): number {
  return parseInt(input, 10);
}
```

## Good

```typescript
export function amount(input: string): number {
  return Number(input);
}
```

## See Also

- [typescript-conv-parseint-radix](conv-parseint-radix.md) - the radix the integer form still needs
- [typescript-conv-number-validate](conv-number-validate.md) - checking the conversion result

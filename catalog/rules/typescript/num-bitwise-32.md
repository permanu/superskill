---
id: typescript-num-bitwise-32
lang: typescript
prefix: num
title: Do not truncate with bitwise operators
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [bitwise, truncation, 32-bit]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Math.trunc]
related: [typescript-num-safe-integer, typescript-conv-integer-check]
sources:
  - title: MDN - Bitwise operators
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_operators
---
> Truncate with `Math.trunc`, not `| 0`, which wraps values to 32-bit signed integers.

## Why

Bitwise operators treat their operands as 32-bit integers, so `value | 0` silently wraps counts above 2^31 and flips the sign of large values. `Math.trunc` removes the fraction across the full number range and states the intent.

## Bad

```typescript
export function pages(total: number, size: number): number {
  return (total / size) | 0;
}
```

## Good

```typescript
export function pages(total: number, size: number): number {
  return Math.trunc(total / size);
}
```

## See Also

- [typescript-num-safe-integer](num-safe-integer.md) - the precision limits that make 32-bit wrapping surprising
- [typescript-conv-integer-check](conv-integer-check.md) - testing whether a value is a whole number

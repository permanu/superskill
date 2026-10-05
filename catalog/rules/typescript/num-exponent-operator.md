---
id: typescript-num-exponent-operator
lang: typescript
prefix: num
title: Write powers with the exponentiation operator
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exponentiation, power, operator]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-num-bitwise-32, typescript-conv-number-explicit]
sources:
  - title: MDN - Exponentiation (**)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation
---
> Use `**` for powers instead of calling `Math.pow`.

## Why

The operator reads as the mathematical expression and accepts BigInt operands, which `Math.pow` rejects; the function call adds nothing for the same operation.

## Bad

```typescript
export function square(value: number): number {
  return Math.pow(value, 2);
}
```

## Good

```typescript
export function square(value: number): number {
  return value ** 2;
}
```

## See Also

- [typescript-num-bitwise-32](num-bitwise-32.md) - the other operator whose numeric behavior surprises
- [typescript-conv-number-explicit](conv-number-explicit.md) - stating a numeric operation explicitly

---
id: typescript-conv-parseint-radix
lang: typescript
prefix: conv
title: Pass an explicit radix to parseInt
severity: should
enforce: tool
tool: "eslint:radix"
baseline: latest
status: verified
triggers:
  keywords: [parseInt, radix, parsing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [parseInt]
related: [typescript-conv-number-explicit, typescript-conv-number-validate]
sources:
  - title: ESLint - radix
    url: https://eslint.org/docs/latest/rules/radix/
  - title: MDN - parseInt
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
---
> Always pass `10` as parseInt's second argument so the base is never inferred from the text.

## Why

Without a radix, `parseInt` picks the base from the prefix, so `"0x10"` parses as 16 and a leading zero historically meant octal; the same string then means different numbers in different runtimes. Radix 10 makes decimal the only reading.

## Bad

```typescript
export function port(input: string): number {
  return parseInt(input);
}
```

## Good

```typescript
export function port(input: string): number {
  return parseInt(input, 10);
}
```

## See Also

- [typescript-conv-number-explicit](conv-number-explicit.md) - choosing the conversion function
- [typescript-conv-number-validate](conv-number-validate.md) - validating what the conversion returned

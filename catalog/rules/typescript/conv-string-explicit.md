---
id: typescript-conv-string-explicit
lang: typescript
prefix: conv
title: Convert to string with String, not empty-string concatenation
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [string conversion, String, concatenation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [String]
related: [typescript-style-template-strings, typescript-conv-number-explicit]
sources:
  - title: MDN - String
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
---
> Convert a value to text with `String(value)` instead of concatenating it with an empty string.

## Why

`"" + value` performs the conversion through the addition operator, which reads as building a string rather than converting one and changes behavior when the other operand is not a string. `String(value)` is the explicit conversion and works the same for every operand type.

## Bad

```typescript
export function label(value: number): string {
  return "" + value;
}
```

## Good

```typescript
export function label(value: number): string {
  return String(value);
}
```

## See Also

- [typescript-style-template-strings](style-template-strings.md) - building a string that mixes text and values
- [typescript-conv-number-explicit](conv-number-explicit.md) - the numeric direction of explicit conversion

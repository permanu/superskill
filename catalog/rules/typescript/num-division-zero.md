---
id: typescript-num-division-zero
lang: typescript
prefix: num
title: Guard division by a length or count
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [division, zero, Infinity]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-num-nan-test, typescript-err-boundary-parse]
sources:
  - title: MDN - Division (/)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Division
  - title: MDN - NaN
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN
---
> Reject a zero denominator before dividing so an empty input cannot produce Infinity or NaN.

## Why

Dividing a number by zero yields Infinity or, for 0/0, NaN; both then flow through later arithmetic as if they were data. An explicit empty check fails where the invalid input is known.

## Bad

```typescript
export function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
```

## Good

```typescript
export function average(values: number[]): number {
  if (values.length === 0) {
    throw new Error("no values");
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
```

## See Also

- [typescript-num-nan-test](num-nan-test.md) - recognizing the NaN this produces
- [typescript-err-boundary-parse](err-boundary-parse.md) - rejecting invalid input at the boundary

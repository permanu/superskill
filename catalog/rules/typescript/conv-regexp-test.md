---
id: typescript-conv-regexp-test
lang: typescript
prefix: conv
title: Test for a match with RegExp.test
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [RegExp.test, match, boolean check]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [RegExp.test]
related: [typescript-perf-regexp-hoist, typescript-sec-no-user-regex]
sources:
  - title: MDN - RegExp.prototype.test
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test
---
> Use `test` when the question is whether a pattern matches, not `match` compared to null.

## Why

`match` builds a result array, and with the global flag every match in the string, just to answer a yes/no question; `test` returns the boolean directly. The method choice makes the intent of the check visible.

## Bad

```typescript
export function hasDigit(value: string): boolean {
  return value.match(/\d/) !== null;
}
```

## Good

```typescript
export function hasDigit(value: string): boolean {
  return /\d/.test(value);
}
```

## See Also

- [typescript-perf-regexp-hoist](perf-regexp-hoist.md) - compiling the pattern once instead of per call
- [typescript-sec-no-user-regex](sec-no-user-regex.md) - escaping input before it becomes a pattern

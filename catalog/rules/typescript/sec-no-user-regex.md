---
id: typescript-sec-no-user-regex
lang: typescript
prefix: sec
title: Escape user input before building a regular expression
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [RegExp, escape, injection, ReDoS]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [RegExp]
related: [typescript-sec-no-eval, typescript-perf-regexp-hoist]
sources:
  - title: MDN - RegExp.escape()
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape
  - title: MDN - RegExp (literal notation and constructor)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
---
> Escape user input before building a regular expression, or avoid regex for literal searches.

## Why

Raw input used as a pattern changes the meaning of the expression: `.` matches any character and constructs like nested quantifiers can be crafted to backtrack exponentially. Escaping the input turns it into a literal pattern, and for a plain substring search the string methods avoid the parser altogether.

## Bad

```typescript
function contains(haystack: string, needle: string): boolean {
  return new RegExp(needle).test(haystack);
}
```

## Good

```typescript
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contains(haystack: string, needle: string): boolean {
  return new RegExp(escapeRegExp(needle)).test(haystack);
}
```

## See Also

- [typescript-sec-no-eval](sec-no-eval.md) - the same principle for code rather than patterns
- [typescript-perf-regexp-hoist](perf-regexp-hoist.md) - compiling the safe pattern once

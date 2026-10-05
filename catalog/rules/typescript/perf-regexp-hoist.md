---
id: typescript-perf-regexp-hoist
lang: typescript
prefix: perf
title: Compile regular expressions once, not on every call
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [RegExp, compile, hoist, hot path]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [RegExp]
related: [typescript-perf-memoize-pure, typescript-perf-measure-first]
sources:
  - title: MDN - RegExp (literal notation and constructor)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp
---
> Hoist a regular expression out of a hot function; the constructor compiles it at call time.

## Why

A `RegExp` has to be compiled before it can match, and MDN documents that the constructor performs that compilation at runtime while a literal is compiled when it is evaluated. Constructing the same pattern inside a function repeats the compilation on every call.

## Bad

```typescript
function isEmail(value: string): boolean {
  return new RegExp("^[^@]+@[^@]+$").test(value);
}
```

## Good

```typescript
const EMAIL_PATTERN = /^[^@]+@[^@]+$/;

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
```

## See Also

- [typescript-perf-memoize-pure](perf-memoize-pure.md) - caching work whose inputs recur
- [typescript-perf-measure-first](perf-measure-first.md) - checking the compilation is the cost

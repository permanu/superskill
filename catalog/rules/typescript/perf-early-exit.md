---
id: typescript-perf-early-exit
lang: typescript
prefix: perf
title: Test membership with some or find so the scan stops early
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [some, find, filter, early exit]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [some, find, filter]
related: [typescript-perf-set-membership, typescript-perf-measure-first]
sources:
  - title: MDN - Array.prototype.some()
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
---
> Test membership with `some` or `find` so the scan stops at the first match.

## Why

`filter` builds a new array with every matching element before the length is tested, so the whole input is scanned and an intermediate array is allocated for a yes-or-no answer. `some` returns as soon as the predicate is true and allocates nothing.

## Bad

```typescript
function hasAdmin(roles: string[]): boolean {
  return roles.filter((role) => role === "admin").length > 0;
}
```

## Good

```typescript
function hasAdmin(roles: string[]): boolean {
  return roles.some((role) => role === "admin");
}
```

## See Also

- [typescript-perf-set-membership](perf-set-membership.md) - the constant-lookup form for repeated checks
- [typescript-perf-measure-first](perf-measure-first.md) - confirming the scan was the cost

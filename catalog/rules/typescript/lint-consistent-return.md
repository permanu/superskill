---
id: typescript-lint-consistent-return
lang: typescript
prefix: lint
title: Return a value on every path instead of mixing bare and valued returns
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/consistent-return"
baseline: latest
status: verified
triggers:
  keywords: [consistent return, early return, undefined]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [return]
related: [typescript-err-result-union]
sources:
  - title: typescript-eslint - consistent-return
    url: https://typescript-eslint.io/rules/consistent-return/
---
> Return an explicit value on every path; never mix `return;` with `return value;` in one function.

## Why

A bare `return;` produces `undefined` through a path that looks empty, so readers cannot tell whether the early exit was intentional or a forgotten value. Writing `return undefined;` makes the result uniform and keeps the declared return type honest.

## Bad

```typescript
export function find(values: string[], target: string): string | undefined {
  if (target === "") {
    return;
  }
  return values.find((value) => value === target);
}
```

## Good

```typescript
export function find(values: string[], target: string): string | undefined {
  if (target === "") {
    return undefined;
  }
  return values.find((value) => value === target);
}
```

## See Also

- [typescript-err-result-union](err-result-union.md) - making every outcome of a function explicit

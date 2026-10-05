---
id: typescript-proj-no-implicit-returns
lang: typescript
prefix: proj
title: Require a return on every code path
severity: should
enforce: tool
tool: "tsc:noImplicitReturns"
baseline: latest
status: verified
triggers:
  keywords: [noImplicitReturns, fallthrough, return path]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [return]
related: [typescript-lint-consistent-return, typescript-err-result-union]
sources:
  - title: TypeScript - noImplicitReturns
    url: https://www.typescriptlang.org/tsconfig/noImplicitReturns.html
---
> Enable `noImplicitReturns` so a function with a declared return type cannot fall off the end.

## Why

A function whose return type includes `undefined` still compiles when a branch falls through, and the caller receives `undefined` through a path the signature never described. The flag turns the missing branch into a compile error instead of a runtime surprise.

## Bad

```typescript
export function grade(score: number): string | undefined {
  if (score > 50) {
    return "pass";
  }
}
```

## Good

```typescript
export function grade(score: number): string | undefined {
  if (score > 50) {
    return "pass";
  }
  return undefined;
}
```

## See Also

- [typescript-lint-consistent-return](lint-consistent-return.md) - returning explicitly on every path, enforced by lint
- [typescript-err-result-union](err-result-union.md) - making every outcome of a function explicit

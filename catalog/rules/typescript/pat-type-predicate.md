---
id: typescript-pat-type-predicate
lang: typescript
prefix: pat
title: Return type predicates from guards
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [type predicate, type guard, narrowing]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-pat-assertion-function, typescript-lint-no-unsafe-return]
sources:
  - title: TypeScript Handbook - Narrowing (using type predicates)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---
> Give a boolean guard a `value is T` return type so callers get narrowing, not just a boolean.

## Why

A `boolean` return tells the compiler nothing about the argument, so callers must cast or re-check after the guard. The type predicate records the guarantee in the signature, and control-flow analysis narrows the argument at every call site.

## Bad

```typescript
export function isString(value: unknown): boolean {
  return typeof value === "string";
}
```

## Good

```typescript
export function isString(value: unknown): value is string {
  return typeof value === "string";
}
```

## See Also

- [typescript-pat-assertion-function](pat-assertion-function.md) - the throwing form of the same narrowing tool
- [typescript-lint-no-unsafe-return](lint-no-unsafe-return.md) - the guards that keep any values out of typed code

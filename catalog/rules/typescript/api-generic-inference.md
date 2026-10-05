---
id: typescript-api-generic-inference
lang: typescript
prefix: api
title: Use the element type as the parameter instead of constraining the container
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generic, inference, constraint, array]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [extends]
related: [typescript-type-generic-constraint, typescript-type-generic-necessity]
sources:
  - title: TypeScript Handbook - More on Functions (push type parameters down)
    url: https://www.typescriptlang.org/docs/handbook/2/functions.html
  - title: TypeScript Handbook - Generics
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
---
> Use the element type as the parameter instead of constraining the container, so inference flows.

## Why

When the type parameter is the container, the compiler resolves the element through the constraint and the result is `unknown` or `any`. Naming the element type directly lets the compiler wait for the call, infer the element, and return it precisely.

## Bad

```typescript
export function firstElement<T extends unknown[]>(values: T): unknown {
  return values[0];
}
```

## Good

```typescript
export function firstElement<T>(values: T[]): T | undefined {
  return values[0];
}
```

## See Also

- [typescript-type-generic-constraint](type-generic-constraint.md) - constraining a parameter to the capability the body uses
- [typescript-type-generic-necessity](type-generic-necessity.md) - removing parameters that relate nothing

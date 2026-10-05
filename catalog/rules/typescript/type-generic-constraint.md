---
id: typescript-type-generic-constraint
lang: typescript
prefix: type
title: Constrain a type parameter to the capability the body uses
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [generic, constraint, extends, type parameter]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [extends]
related: [typescript-type-generic-necessity, typescript-type-unsafe-cast]
sources:
  - title: TypeScript Handbook - Generics (generic constraints)
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
---
> Constrain a type parameter to the members the body uses instead of asserting inside the body.

## Why

An unconstrained parameter forces the implementation to cast before touching any member, and the cast moves the failure to runtime for every caller that passes a value without that member. A constraint states the requirement in the signature, so invalid arguments are rejected at the call site and the body needs no assertion.

## Bad

```typescript
function describeLength<T>(value: T): string {
  const sized = value as unknown as { length: number };
  return `${sized.length} items`;
}
```

## Good

```typescript
function describeLength<T extends { length: number }>(value: T): string {
  return `${value.length} items`;
}
```

## See Also

- [typescript-type-generic-necessity](type-generic-necessity.md) - removing parameters that relate nothing
- [typescript-type-unsafe-cast](type-unsafe-cast.md) - the assertion pattern this rule removes

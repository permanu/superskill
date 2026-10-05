---
id: typescript-type-generic-necessity
lang: typescript
prefix: type
title: Add a type parameter only when it relates two positions
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unnecessary-type-parameters"
baseline: latest
status: verified
triggers:
  keywords: [generic, type parameter, unnecessary, inference]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [extends]
related: [typescript-type-generic-constraint, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - no-unnecessary-type-parameters
    url: https://typescript-eslint.io/rules/no-unnecessary-type-parameters/
  - title: TypeScript Handbook - Generics
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
---
> Use a type parameter only when it links two positions; a parameter used once adds nothing.

## Why

A type parameter is a relationship: the same type appears in an input and an output, and the caller controls both. When the parameter appears only once, the caller cannot constrain anything the implementation cares about, and the parameter can disguise an unsafe assertion behind an apparently generic signature.

## Bad

```typescript
function describe<T extends string>(value: T): string {
  return `value: ${value}`;
}
```

## Good

```typescript
function describe(value: string): string {
  return `value: ${value}`;
}
```

## See Also

- [typescript-type-generic-constraint](type-generic-constraint.md) - constraining the parameters that remain
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - the other form of a signature that promises more than it checks

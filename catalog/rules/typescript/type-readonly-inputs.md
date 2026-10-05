---
id: typescript-type-readonly-inputs
lang: typescript
prefix: type
title: Type read-only parameters as readonly so callers can pass frozen data
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readonly, immutability, parameter, frozen]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [readonly]
related: [typescript-type-optional-not-undefined]
sources:
  - title: TypeScript Handbook - Object Types (ReadonlyArray, readonly properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
  - title: TypeScript Handbook - Utility Types (Readonly)
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
---
> Mark parameters and properties `readonly` when the code only reads them, so callers can pass frozen data.

## Why

A mutable parameter type promises the callee may write, which rejects `readonly` arrays and frozen objects that callers hold. `readonly` on the parameter is a statement about what the function does not do, and it is the only way for the checker to prove the function will not mutate its input.

## Bad

```typescript
function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
```

## Good

```typescript
function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const frozen: readonly number[] = [1, 2, 3];
sum(frozen);
```

## See Also

- [typescript-type-optional-not-undefined](type-optional-not-undefined.md) - the other side of precise input types

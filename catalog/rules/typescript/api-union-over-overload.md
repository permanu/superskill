---
id: typescript-api-union-over-overload
lang: typescript
prefix: api
title: Use one union parameter instead of overloads with the same return type
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [overload, union, signature, parameters]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [overload]
related: [typescript-api-options-object, typescript-type-discriminated-union-state]
sources:
  - title: TypeScript Handbook - More on Functions (writing good overloads)
    url: https://www.typescriptlang.org/docs/handbook/2/functions.html
---
> Use one union parameter instead of overloads when every signature returns the same type.

## Why

Overloads resolve a call to exactly one signature, so a value whose type is the union of both members matches neither and callers must narrow for no reason. A single union parameter accepts every case, and the implementation narrows once with the same control flow callers use elsewhere.

## Bad

```typescript
export function length(value: string): number;
export function length(value: string[]): number;
export function length(value: string | string[]): number {
  return value.length;
}
```

## Good

```typescript
export function length(value: string | string[]): number {
  return value.length;
}
```

## See Also

- [typescript-api-options-object](api-options-object.md) - the other signature-simplification decision
- [typescript-type-discriminated-union-state](type-discriminated-union-state.md) - narrowing the union inside the body

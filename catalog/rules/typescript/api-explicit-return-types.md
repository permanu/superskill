---
id: typescript-api-explicit-return-types
lang: typescript
prefix: api
title: Annotate exported function return types
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/explicit-module-boundary-types"
baseline: latest
status: verified
triggers:
  keywords: [return type, export, public API, inference]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [export]
related: [typescript-api-minimal-surface, typescript-api-options-object]
sources:
  - title: typescript-eslint - explicit-module-boundary-types
    url: https://typescript-eslint.io/rules/explicit-module-boundary-types/
  - title: TypeScript Handbook - More on Functions (return type annotations)
    url: https://www.typescriptlang.org/docs/handbook/2/functions.html
---
> Annotate exported functions' return types so the public contract cannot drift silently.

## Why

An inferred return type changes whenever the implementation changes, so a refactor inside the module can widen or narrow the public API without a review signal. An explicit annotation fixes the contract at the boundary, and the compiler then rejects the implementation change that would break it.

## Bad

```typescript
export function total(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}
```

## Good

```typescript
export function total(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
```

## See Also

- [typescript-api-minimal-surface](api-minimal-surface.md) - keeping the exported surface deliberate
- [typescript-api-options-object](api-options-object.md) - the other half of a deliberate signature

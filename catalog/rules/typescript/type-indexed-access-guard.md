---
id: typescript-type-indexed-access-guard
lang: typescript
prefix: type
title: Treat indexed reads as possibly missing and guard before use
severity: should
enforce: both
tool: "tsc:noUncheckedIndexedAccess"
baseline: latest
status: verified
triggers:
  keywords: [indexed access, undefined, array, index signature]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [undefined]
related: [typescript-type-no-non-null-assertion, typescript-type-optional-not-undefined]
sources:
  - title: TSConfig Reference - noUncheckedIndexedAccess
    url: https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html
  - title: TypeScript Handbook - Object Types (index signatures)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Guard indexed reads before using them; the element type can be `undefined` at every index.

## Why

An index signature and an array index describe every possible key, including keys that were never written, so the read can produce `undefined` even when the type says otherwise. Checking the read before use turns a possible runtime property access on `undefined` into an explicit branch.

## Bad

```typescript
function firstUpper(names: string[]): string {
  return names[0].toUpperCase();
}
```

## Good

```typescript
function firstUpper(names: string[]): string {
  const first = names.at(0);
  if (first === undefined) {
    throw new Error("names must not be empty");
  }
  return first.toUpperCase();
}
```

## See Also

- [typescript-type-no-non-null-assertion](type-no-non-null-assertion.md) - the assertion this rule replaces with a guard
- [typescript-type-optional-not-undefined](type-optional-not-undefined.md) - absence in object properties

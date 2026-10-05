---
id: typescript-type-no-function-type
lang: typescript
prefix: type
title: Replace the Function type with an explicit call signature
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unsafe-function-type"
baseline: latest
status: verified
triggers:
  keywords: [Function, call signature, callback, type]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Function]
related: [typescript-type-no-explicit-any, typescript-type-generic-constraint]
sources:
  - title: typescript-eslint - no-unsafe-function-type
    url: https://typescript-eslint.io/rules/no-unsafe-function-type/
  - title: TypeScript Handbook - More on Functions
    url: https://www.typescriptlang.org/docs/handbook/2/functions.html
---
> Replace the `Function` type with an explicit call signature; `Function` accepts any callable and returns `any`.

## Why

`Function` accepts any number of arguments and its result is `any`, so a call through it is unchecked on both sides. An explicit signature documents the arguments and return type the code relies on, and the compiler then verifies every caller and implementation against it.

## Bad

```typescript
function callHandler(handler: Function): void {
  handler();
}
```

## Good

```typescript
function callHandler(handler: () => void): void {
  handler();
}
```

## See Also

- [typescript-type-no-explicit-any](type-no-explicit-any.md) - the `any` that leaks out of every `Function` call
- [typescript-type-generic-constraint](type-generic-constraint.md) - constraining callables when the signature is open

---
id: typescript-type-no-explicit-any
lang: typescript
prefix: type
title: Use unknown or a precise type instead of any
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-explicit-any"
baseline: latest
status: verified
triggers:
  keywords: [any, unknown, escape hatch, type safety]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [any, unknown]
related: [typescript-err-catch-unknown, typescript-type-unsafe-cast]
sources:
  - title: typescript-eslint - no-explicit-any
    url: https://typescript-eslint.io/rules/no-explicit-any/
  - title: TypeScript Handbook - Everyday Types (any)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Use `unknown` or a precise type instead of `any`; `any` disables checking for everything it touches.

## Why

A value typed `any` accepts every operation, and every result it produces is also `any`, so one annotation can silently switch off checking through a whole call chain. `unknown` keeps the value opaque until a guard proves its shape, which preserves the safety the type system is there to provide.

## Bad

```typescript
function formatValue(value: any): string {
  return value.toFixed(2);
}
```

## Good

```typescript
function formatValue(value: unknown): string {
  if (typeof value !== "number") {
    throw new Error("value must be a number");
  }
  return value.toFixed(2);
}
```

## See Also

- [typescript-err-catch-unknown](err-catch-unknown.md) - the catch-clause case of the same escape hatch
- [typescript-type-unsafe-cast](type-unsafe-cast.md) - the assertion form of switching off checking

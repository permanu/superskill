---
id: typescript-type-no-empty-object
lang: typescript
prefix: type
title: Replace empty object types with unknown or a real shape
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-empty-object-type"
baseline: latest
status: verified
triggers:
  keywords: [empty object, interface, unknown, object]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [object, unknown]
related: [typescript-type-no-wrapper-types, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - no-empty-object-type
    url: https://typescript-eslint.io/rules/no-empty-object-type/
  - title: TypeScript Handbook - Object Types
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Do not use `{}` or an empty interface as a type; `{}` accepts any non-nullish value.

## Why

`{}` means "any value that is defined", including numbers, strings, and booleans, which is almost never the intended contract for a parameter or field. `unknown` states that the value is unchecked, and a real shape states what the code requires; both beat a type that lies about being an object.

## Bad

```typescript
function logValue(value: {}): void {
  console.log(value);
}
```

## Good

```typescript
function logValue(value: unknown): void {
  console.log(value);
}
```

## See Also

- [typescript-type-no-wrapper-types](type-no-wrapper-types.md) - the `Object` wrapper form of the same mistake
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - `unknown` as the safe top type

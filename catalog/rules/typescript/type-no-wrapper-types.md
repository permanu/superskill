---
id: typescript-type-no-wrapper-types
lang: typescript
prefix: type
title: Use lowercase primitive types instead of wrapper object types
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-wrapper-object-types"
baseline: latest
status: verified
triggers:
  keywords: [String, Number, Boolean, wrapper, primitive]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [String, Number, Boolean, Object]
related: [typescript-type-no-empty-object, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - no-wrapper-object-types
    url: https://typescript-eslint.io/rules/no-wrapper-object-types/
  - title: TypeScript Handbook - Everyday Types (the primitives)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Use lowercase primitive types; `String`, `Number`, `Boolean`, and `Object` describe wrapper objects.

## Why

The uppercase types describe boxed objects, not the primitives code actually works with: `new Boolean(false)` is truthy, and boxed values compare by reference. Structural typing lets primitives satisfy the wrapper types too, so the mistake passes review while describing the wrong runtime value.

## Bad

```typescript
function label(value: String, count: Number): string {
  return `${value} (${count})`;
}
```

## Good

```typescript
function label(value: string, count: number): string {
  return `${value} (${count})`;
}
```

## See Also

- [typescript-type-no-empty-object](type-no-empty-object.md) - the `Object` and `{}` half of the same confusion
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - the other type that describes nothing useful

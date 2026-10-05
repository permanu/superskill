---
id: typescript-type-const-assertion
lang: typescript
prefix: type
title: Mark literal tables as const so their values keep literal types
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [as const, literal, readonly, inference]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [as const]
related: [typescript-type-readonly-inputs, typescript-type-derive-utility-types]
sources:
  - title: TypeScript Handbook - Everyday Types (literal inference, as const)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: TypeScript Handbook - Object Types (readonly tuple types)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Mark literal tables `as const` so their values keep literal types and stay readonly.

## Why

Without a const assertion, an object literal widens each property value to `string` or `number`; the keys stay literal, but the values collapse and the exact strings the table was written with are lost from the type. `as const` preserves each value as its literal type and marks the table readonly, so a value union such as `(typeof routes)[keyof typeof routes]` is the exact set of entries instead of `string`.

## Bad

```typescript
const routes = { home: "/", user: "/users/:id" };

type RoutePath = (typeof routes)[keyof typeof routes];

function link(path: RoutePath): string {
  return path;
}
```

## Good

```typescript
const routes = { home: "/", user: "/users/:id" } as const;

type RoutePath = (typeof routes)[keyof typeof routes];

function link(path: RoutePath): string {
  return path;
}
```

## See Also

- [typescript-type-readonly-inputs](type-readonly-inputs.md) - accepting the readonly values `as const` produces
- [typescript-type-derive-utility-types](type-derive-utility-types.md) - deriving types from a single declaration

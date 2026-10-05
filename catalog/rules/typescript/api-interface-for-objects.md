---
id: typescript-api-interface-for-objects
lang: typescript
prefix: api
title: Use an interface for exported object shapes consumers may extend
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, type alias, object shape, extend]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [interface]
related: [typescript-api-explicit-return-types, typescript-api-minimal-surface]
sources:
  - title: TypeScript Handbook - Everyday Types (interfaces and type aliases)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - title: TypeScript Handbook - Object Types (extending types)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Use an interface for exported object shapes consumers may extend.

## Why

An interface can be extended and merged by consumers, and it always appears by name in error messages, while an alias is only a name for whatever expression it wraps. For plain object contracts the two are otherwise equivalent, so the extensible form is the safer default for a public shape.

## Bad

```typescript
export type User = {
  id: string;
  email: string;
};
```

## Good

```typescript
export interface User {
  id: string;
  email: string;
}
```

## See Also

- [typescript-api-explicit-return-types](api-explicit-return-types.md) - typing the functions that use the shape
- [typescript-api-minimal-surface](api-minimal-surface.md) - whether the shape needs to be exported at all

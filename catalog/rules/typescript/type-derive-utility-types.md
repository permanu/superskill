---
id: typescript-type-derive-utility-types
lang: typescript
prefix: type
title: Derive related types with Pick, Omit, and Partial from one source
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Pick, Omit, Partial, utility types, derive]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Pick, Omit, Partial]
related: [typescript-type-discriminated-union-state]
sources:
  - title: TypeScript Handbook - Utility Types
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
  - title: TypeScript Handbook - Object Types
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Derive related types with `Pick`, `Omit`, and `Partial` so new fields propagate instead of drifting.

## Why

Hand-copied variants of an interface drift as soon as the source gains a field, and the compiler cannot tell that the copies were meant to stay in sync. Utility types derive each variant from one source, so a field added to the source is automatically present, omitted, or optional everywhere it belongs.

## Bad

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
}

interface PublicUser {
  id: string;
  email: string;
}
```

## Good

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
}

type PublicUser = Omit<User, "passwordHash">;
```

## See Also

- [typescript-type-discriminated-union-state](type-discriminated-union-state.md) - deriving state types from one representation

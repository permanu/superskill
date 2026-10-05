---
id: typescript-test-typed-fixtures
lang: typescript
prefix: test
title: Build complete typed fixtures instead of casting partial objects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fixture, factory, cast, partial]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Partial]
related: [typescript-type-unsafe-cast, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - no-unsafe-type-assertion
    url: https://typescript-eslint.io/rules/no-unsafe-type-assertion/
  - title: TSConfig Reference - strict
    url: https://www.typescriptlang.org/tsconfig/strict.html
---
> Build complete typed fixtures instead of asserting partial objects into production types.

## Why

A fixture cast from `Partial<T>` tells the checker the object is complete when fields are still missing, so the test exercises a value that cannot exist in production. Filling every required field in a factory keeps the fixture honest and centralizes the defaults that tests share.

## Bad

```typescript
interface User {
  id: string;
  email: string;
}

function makeUser(input: Partial<User>): User {
  return input as User;
}

const user = makeUser({ id: "u1" });
```

## Good

```typescript
interface User {
  id: string;
  email: string;
}

function makeUser(input: Partial<User> = {}): User {
  return {
    id: input.id ?? "user-1",
    email: input.email ?? "user@example.com",
  };
}

const user = makeUser({ id: "u1" });
```

## See Also

- [typescript-type-unsafe-cast](type-unsafe-cast.md) - the assertion pattern this rule removes from tests
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - the other shortcut that weakens test types

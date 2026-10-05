---
id: typescript-pat-assertion-function
lang: typescript
prefix: pat
title: Encode invariants as assertion functions
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertion function, invariant, narrowing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [asserts]
related: [typescript-pat-type-predicate, typescript-err-throw-error-only]
sources:
  - title: TypeScript Handbook - Narrowing (assertion functions)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---
> Move a repeated invariant check into an assertion function so narrowing propagates to every caller.

## Why

The same undefined check tends to be copied into every function that receives a nullable value, and each copy repeats the throw and the message. An assertion function puts the check in one signature: callers get the narrowed type after the call, and the failure text stays in one place.

## Bad

```typescript
export interface User {
  id: string;
  name: string;
}

export function userId(user: User | undefined): string {
  if (user === undefined) {
    throw new Error("missing user");
  }
  return user.id;
}

export function userName(user: User | undefined): string {
  if (user === undefined) {
    throw new Error("missing user");
  }
  return user.name;
}
```

## Good

```typescript
export interface User {
  id: string;
  name: string;
}

function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message);
  }
}

export function userId(user: User | undefined): string {
  assertDefined(user, "missing user");
  return user.id;
}

export function userName(user: User | undefined): string {
  assertDefined(user, "missing user");
  return user.name;
}
```

## See Also

- [typescript-pat-type-predicate](pat-type-predicate.md) - the boolean-returning form of the same narrowing tool
- [typescript-err-throw-error-only](err-throw-error-only.md) - the Error instances the assertion throws

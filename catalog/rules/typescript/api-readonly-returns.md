---
id: typescript-api-readonly-returns
lang: typescript
prefix: api
title: Return a readonly collection when callers must not mutate it
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readonly, return type, array, mutation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [readonly]
related: [typescript-type-readonly-inputs, typescript-api-readonly-fields]
sources:
  - title: TypeScript Handbook - Object Types (ReadonlyArray)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
  - title: TypeScript Handbook - Utility Types (Readonly)
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
---
> Return a `readonly` collection when callers must not mutate the result.

## Why

Returning a mutable array invites callers to push into a structure the function may share, cache, or reuse, and the compiler cannot flag the write. A `readonly` return type makes the ownership boundary explicit without changing runtime behavior.

## Bad

```typescript
export function tags(): string[] {
  return ["a", "b"];
}
```

## Good

```typescript
export function tags(): readonly string[] {
  return ["a", "b"];
}
```

## See Also

- [typescript-type-readonly-inputs](type-readonly-inputs.md) - the input half of the read-only contract
- [typescript-api-readonly-fields](api-readonly-fields.md) - read-only class members

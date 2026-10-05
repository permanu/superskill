---
id: typescript-type-discriminated-union-state
lang: typescript
prefix: type
title: Model mutually exclusive states as a discriminated union, not optional fields
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [discriminated union, state, status, optional]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [status]
related: [typescript-type-exhaustive-union, typescript-err-result-union]
sources:
  - title: TypeScript Handbook - Narrowing (discriminated unions)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  - title: TypeScript Handbook - Object Types (optional properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Model mutually exclusive states as a discriminated union; optional-field clusters permit impossible combinations.

## Why

A record with a boolean flag plus optional `data` and `error` fields can represent states the domain forbids, such as loading with both values set, and every consumer has to re-derive the rules. A union keyed by a literal makes the illegal states unrepresentable and lets the checker narrow on the key.

## Bad

```typescript
interface RequestState {
  loading: boolean;
  data?: string;
  error?: string;
}

function describe(state: RequestState): string {
  if (state.error !== undefined) {
    return `failed: ${state.error}`;
  }
  return state.data ?? "pending";
}
```

## Good

```typescript
type RequestState =
  | { status: "loading" }
  | { status: "ready"; data: string }
  | { status: "failed"; error: string };

function describe(state: RequestState): string {
  switch (state.status) {
    case "loading":
      return "pending";
    case "ready":
      return state.data;
    case "failed":
      return `failed: ${state.error}`;
  }
}
```

## See Also

- [typescript-type-exhaustive-union](type-exhaustive-union.md) - making the switch handle every member
- [typescript-err-result-union](err-result-union.md) - the same union shape for fallible results

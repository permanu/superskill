---
id: typescript-type-exhaustive-union
lang: typescript
prefix: type
title: Handle every union member and assert never in the default case
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/switch-exhaustiveness-check"
baseline: latest
status: verified
triggers:
  keywords: [exhaustive, switch, never, union]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [never]
related: [typescript-type-discriminated-union-state]
sources:
  - title: TypeScript Handbook - Narrowing (exhaustiveness checking)
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
  - title: typescript-eslint - switch-exhaustiveness-check
    url: https://typescript-eslint.io/rules/switch-exhaustiveness-check/
---
> Handle every union member and assert `never` in the default so a new member fails compilation.

## Why

A partial switch over a union silently falls through to a default branch that guesses, so adding a member changes behavior without any compiler error. Assigning the narrowed value to `never` in the default turns the missing case into a compile-time failure at the exact switch that must be updated.

## Bad

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  if (shape.kind === "circle") {
    return Math.PI * shape.radius ** 2;
  }
  return 0;
}
```

## Good

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    default: {
      const unhandled: never = shape;
      throw new Error(`unhandled shape: ${String(unhandled)}`);
    }
  }
}
```

## See Also

- [typescript-type-discriminated-union-state](type-discriminated-union-state.md) - the union shape this rule exhausts

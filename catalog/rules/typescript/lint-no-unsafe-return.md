---
id: typescript-lint-no-unsafe-return
lang: typescript
prefix: lint
title: Do not return any values from typed functions
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unsafe-return"
baseline: latest
status: verified
triggers:
  keywords: [no-unsafe-return, any, return type]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [any, unknown]
related: [typescript-lint-no-unsafe-assignment, typescript-api-explicit-return-types]
sources:
  - title: typescript-eslint - no-unsafe-return
    url: https://typescript-eslint.io/rules/no-unsafe-return/
---
> Narrow `any` values before returning them so the declared return type is enforced.

## Why

Returning an `any` value satisfies any declared return type without evidence that it matches, so the type hole spreads to every caller while the signature still promises a checked value. Narrowing to `unknown` at the boundary and returning only after a guard keeps the function's contract true.

## Bad

```typescript
declare function parse(input: string): any;

export function text(input: string): string {
  return parse(input);
}
```

## Good

```typescript
declare function parse(input: string): unknown;

function isText(value: unknown): value is string {
  return typeof value === "string";
}

export function text(input: string): string {
  const value = parse(input);
  if (!isText(value)) {
    throw new Error("expected a string");
  }
  return value;
}
```

## See Also

- [typescript-lint-no-unsafe-assignment](lint-no-unsafe-assignment.md) - the same hole at the assignment
- [typescript-api-explicit-return-types](api-explicit-return-types.md) - writing the contract the return must satisfy

---
id: typescript-lint-no-unsafe-assignment
lang: typescript
prefix: lint
title: Do not assign any values into typed variables
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unsafe-assignment"
baseline: latest
status: verified
triggers:
  keywords: [no-unsafe-assignment, any, unknown]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [any, unknown]
related: [typescript-lint-no-unsafe-return, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - no-unsafe-assignment
    url: https://typescript-eslint.io/rules/no-unsafe-assignment/
---
> Assign `any` values to `unknown` and narrow them instead of letting them flow into typed variables.

## Why

`any` values arrive from JSON parsing and untyped dependencies and switch off checking for everything they touch; assigning one to a typed variable creates a value that looks checked but is not. `unknown` keeps the value opaque until a guard proves its shape, so the assignment cannot launder the type hole.

## Bad

```typescript
declare function parse(input: string): any;

export function text(input: string): string {
  const value: string = parse(input);
  return value;
}
```

## Good

```typescript
declare function parse(input: string): unknown;

export function text(input: string): string {
  const value = parse(input);
  if (typeof value !== "string") {
    throw new Error("expected a string");
  }
  return value;
}
```

## See Also

- [typescript-lint-no-unsafe-return](lint-no-unsafe-return.md) - the same hole at the return statement
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - removing the any that starts the flow

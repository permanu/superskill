---
id: typescript-lint-no-unnecessary-type-assertion
lang: typescript
prefix: lint
title: Remove type assertions that do not change the type
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/no-unnecessary-type-assertion"
baseline: latest
status: verified
triggers:
  keywords: [type assertion, as, unnecessary]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [as]
related: [typescript-type-unsafe-cast, typescript-lint-no-unnecessary-condition]
sources:
  - title: typescript-eslint - no-unnecessary-type-assertion
    url: https://typescript-eslint.io/rules/no-unnecessary-type-assertion/
---
> Delete `as` assertions that leave the expression's type unchanged.

## Why

An assertion that does not change the type adds visual noise and suggests a narrowing that never happened. Removing it keeps every remaining `as` meaningful: each one marks a real conversion that the compiler could not make on its own.

## Bad

```typescript
export function total(): number {
  const value = 3 + 5;
  return value as number;
}
```

## Good

```typescript
export function total(): number {
  const value = 3 + 5;
  return value;
}
```

## See Also

- [typescript-type-unsafe-cast](type-unsafe-cast.md) - the assertions that do change the type and need a guard
- [typescript-lint-no-unnecessary-condition](lint-no-unnecessary-condition.md) - the same principle applied to branches

---
id: typescript-lint-no-unnecessary-condition
lang: typescript
prefix: lint
title: Remove conditions the types prove are always true or false
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-unnecessary-condition"
baseline: latest
status: verified
triggers:
  keywords: [unnecessary condition, optional chain, dead branch]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: ["??", "?."]
related: [typescript-lint-strict-boolean-expressions, typescript-type-no-non-null-assertion]
sources:
  - title: typescript-eslint - no-unnecessary-condition
    url: https://typescript-eslint.io/rules/no-unnecessary-condition/
---
> Delete nullish guards and truthiness checks on values whose types cannot be nullish.

## Why

A branch the type system proves unreachable is dead code: it either misstates the value's type or survives a refactor that removed the possibility it guarded. Removing the check, or correcting the type that made it look necessary, keeps conditions meaningful.

## Bad

```typescript
export function label(user: { name: string }): string {
  return user?.name ?? "";
}
```

## Good

```typescript
export function label(user: { name: string }): string {
  return user.name;
}
```

## See Also

- [typescript-lint-strict-boolean-expressions](lint-strict-boolean-expressions.md) - explicit comparisons for values that can be falsy
- [typescript-type-no-non-null-assertion](type-no-non-null-assertion.md) - narrowing instead of assuming a value is present

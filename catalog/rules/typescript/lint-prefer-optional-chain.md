---
id: typescript-lint-prefer-optional-chain
lang: typescript
prefix: lint
title: Use ?. instead of && chains for nullable property access
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/prefer-optional-chain"
baseline: latest
status: verified
triggers:
  keywords: [optional chain, nullish access, "&&"]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: ["?."]
related: [typescript-lint-prefer-nullish-coalescing, typescript-lint-no-unnecessary-condition]
sources:
  - title: typescript-eslint - prefer-optional-chain
    url: https://typescript-eslint.io/rules/prefer-optional-chain/
---
> Access optional properties with `?.` instead of repeating the object in an `&&` chain.

## Why

The `&&` form repeats the receiver at every step and short-circuits on any falsy value rather than on nullish ones, so a falsy-but-valid value skips the property access. `?.` states the nullish check once and keeps the chain to a single expression.

## Bad

```typescript
export function city(user: { address?: { city: string } }): string | undefined {
  return user.address && user.address.city;
}
```

## Good

```typescript
export function city(user: { address?: { city: string } }): string | undefined {
  return user.address?.city;
}
```

## See Also

- [typescript-lint-prefer-nullish-coalescing](lint-prefer-nullish-coalescing.md) - the matching fallback for a missing chain
- [typescript-lint-no-unnecessary-condition](lint-no-unnecessary-condition.md) - removing chains the types prove unnecessary

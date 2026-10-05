---
id: typescript-lint-prefer-nullish-coalescing
lang: typescript
prefix: lint
title: Use ?? for fallbacks so only nullish values are replaced
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/prefer-nullish-coalescing"
baseline: latest
status: verified
triggers:
  keywords: [nullish coalescing, fallback, "||"]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: ["??"]
related: [typescript-lint-strict-boolean-expressions, typescript-lint-prefer-optional-chain]
sources:
  - title: typescript-eslint - prefer-nullish-coalescing
    url: https://typescript-eslint.io/rules/prefer-nullish-coalescing/
---
> Default with `??` instead of `||` when only `null` and `undefined` should trigger the fallback.

## Why

`||` replaces every falsy value, so an empty string or a zero silently becomes the default even though it is a valid value. `??` coalesces only on `null` and `undefined`, which matches the nullable type it is given.

## Bad

```typescript
export function label(value: string | null): string {
  return value || "default";
}
```

## Good

```typescript
export function label(value: string | null): string {
  return value ?? "default";
}
```

## See Also

- [typescript-lint-strict-boolean-expressions](lint-strict-boolean-expressions.md) - explicit comparisons in conditions
- [typescript-lint-prefer-optional-chain](lint-prefer-optional-chain.md) - the nullish check for property access

---
id: typescript-lint-boolean-literal-compare
lang: typescript
prefix: lint
title: Compare booleans directly instead of against true or false
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/no-unnecessary-boolean-literal-compare"
baseline: latest
status: verified
triggers:
  keywords: [boolean comparison, === true, unnecessary]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [boolean]
related: [typescript-lint-strict-boolean-expressions, typescript-lint-no-unnecessary-condition]
sources:
  - title: typescript-eslint - no-unnecessary-boolean-literal-compare
    url: https://typescript-eslint.io/rules/no-unnecessary-boolean-literal-compare/
---
> Use a boolean value directly, or negate it with `!`, instead of writing `=== true` or `=== false`.

## Why

Comparing a boolean-typed value to `true` or `false` always yields the same boolean as the value itself, so the comparison is noise; `=== false` in particular reads as a double negative. The value, or `!value`, states the condition directly.

## Bad

```typescript
export function visible(flag: boolean): string {
  return flag === true ? "yes" : "no";
}
```

## Good

```typescript
export function visible(flag: boolean): string {
  return flag ? "yes" : "no";
}
```

## See Also

- [typescript-lint-strict-boolean-expressions](lint-strict-boolean-expressions.md) - explicit comparisons where truthiness is not enough
- [typescript-lint-no-unnecessary-condition](lint-no-unnecessary-condition.md) - removing conditions that cannot vary

---
id: typescript-anti-strict-equality
lang: typescript
prefix: anti
title: Compare with strict equality, not loose equality
severity: should
enforce: tool
tool: "eslint:eqeqeq"
baseline: latest
status: verified
triggers:
  keywords: [strict equality, loose equality, coercion]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: ["==="]
related: [typescript-lint-strict-boolean-expressions, typescript-anti-cond-assign]
sources:
  - title: ESLint - eqeqeq
    url: https://eslint.org/docs/latest/rules/eqeqeq/
  - title: MDN - Strict equality (===)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality
---
> Compare values with `===` and `!==` so a type mismatch is an error instead of a silent coercion.

## Why

Loose equality runs the abstract equality algorithm, so `0 == ""` is true and values of different types convert before they are compared; the conversion rules are hard to recall and hide type mismatches. Strict equality returns false for different types, which surfaces the bug at the comparison.

## Bad

```typescript
export function isEnabled(input: string): boolean {
  return input == "enabled";
}
```

## Good

```typescript
export function isEnabled(input: string): boolean {
  return input === "enabled";
}
```

## See Also

- [typescript-lint-strict-boolean-expressions](lint-strict-boolean-expressions.md) - the truthiness form of implicit coercion
- [typescript-anti-cond-assign](anti-cond-assign.md) - the assignment typo that strict comparison prevents

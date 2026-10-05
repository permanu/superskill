---
id: typescript-anti-cond-assign
lang: typescript
prefix: anti
title: Do not assign inside a condition
severity: must
enforce: tool
tool: "eslint:no-cond-assign"
baseline: latest
status: verified
triggers:
  keywords: [assignment in condition, typo, conditional]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [if]
related: [typescript-anti-strict-equality]
sources:
  - title: ESLint - no-cond-assign
    url: https://eslint.org/docs/latest/rules/no-cond-assign/
---
> Use `===` in a condition; an `=` there is a typo the reader cannot see.

## Why

A comparison operator mistyped as an assignment still compiles whenever the assigned value works as a condition, so the branch tests the assigned value instead of the comparison result and mutates a variable as a side effect of testing it. The two operators differ by one character, which is exactly why the mistake survives review.

## Bad

```typescript
export function matches(input: string, expected: string): boolean {
  if (input = expected) {
    return true;
  }
  return false;
}
```

## Good

```typescript
export function matches(input: string, expected: string): boolean {
  return input === expected;
}
```

## See Also

- [typescript-anti-strict-equality](anti-strict-equality.md) - the comparison the condition was meant to make

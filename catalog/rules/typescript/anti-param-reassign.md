---
id: typescript-anti-param-reassign
lang: typescript
prefix: anti
title: Do not reassign function parameters
severity: prefer
enforce: tool
tool: "eslint:no-param-reassign"
baseline: latest
status: verified
triggers:
  keywords: [parameter reassignment, mutation, local copy]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [return]
related: [typescript-api-readonly-fields]
sources:
  - title: ESLint - no-param-reassign
    url: https://eslint.org/docs/latest/rules/no-param-reassign/
---
> Keep parameters read-only; copy to a local when the function needs to adjust the value.

## Why

Reassigning a parameter hides where the caller's value was replaced, so a reader tracking the argument has to re-derive it halfway through the function. A named local keeps the original value available and makes the transformation explicit.

## Bad

```typescript
export function increment(value: number): number {
  value += 1;
  return value;
}
```

## Good

```typescript
export function increment(value: number): number {
  return value + 1;
}
```

## See Also

- [typescript-api-readonly-fields](api-readonly-fields.md) - the same stability principle for class fields

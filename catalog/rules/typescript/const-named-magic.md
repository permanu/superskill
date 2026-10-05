---
id: typescript-const-named-magic
lang: typescript
prefix: const
title: Name repeated literal values as constants
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/no-magic-numbers"
baseline: latest
status: verified
triggers:
  keywords: [magic numbers, constants, naming]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-style-naming-convention, typescript-const-default-parameter]
sources:
  - title: typescript-eslint - no-magic-numbers
    url: https://typescript-eslint.io/rules/no-magic-numbers/
---
> Give a literal that carries meaning a named constant instead of repeating the number.

## Why

A bare number at a comparison says nothing about why it is that value, and changing it means finding every copy. A named constant states the meaning once and gives the change a single home.

## Bad

```typescript
export function allowed(retries: number): boolean {
  return retries > 3;
}
```

## Good

```typescript
const MAX_RETRIES = 3;

export function allowed(retries: number): boolean {
  return retries > MAX_RETRIES;
}
```

## See Also

- [typescript-style-naming-convention](style-naming-convention.md) - the casing convention for the constant's name
- [typescript-const-default-parameter](const-default-parameter.md) - the same value appearing as a signature default

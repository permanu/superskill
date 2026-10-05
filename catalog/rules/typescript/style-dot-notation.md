---
id: typescript-style-dot-notation
lang: typescript
prefix: style
title: Access properties with dot notation when the name is known
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/dot-notation"
baseline: latest
status: verified
triggers:
  keywords: [dot notation, property access, brackets]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-type-indexed-access-guard]
sources:
  - title: typescript-eslint - dot-notation
    url: https://typescript-eslint.io/rules/dot-notation/
---
> Read a known property with `object.key`; keep brackets for dynamic keys.

## Why

Bracket access with a string literal says the key is dynamic when it is not, and it skips the editor's rename and reference tracking for that property. Dot notation states that the property is part of the type and lets tooling treat it as one.

## Bad

```typescript
export function timeoutOf(options: { timeout: number }): number {
  return options["timeout"];
}
```

## Good

```typescript
export function timeoutOf(options: { timeout: number }): number {
  return options.timeout;
}
```

## See Also

- [typescript-type-indexed-access-guard](type-indexed-access-guard.md) - the dynamic-key case where brackets and a guard are correct

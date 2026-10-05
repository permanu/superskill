---
id: typescript-type-no-non-null-assertion
lang: typescript
prefix: type
title: Narrow nullable values instead of asserting them non-null
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-non-null-assertion"
baseline: latest
status: verified
triggers:
  keywords: [non-null, assertion, nullable, undefined]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [undefined]
related: [typescript-type-optional-not-undefined, typescript-type-indexed-access-guard]
sources:
  - title: typescript-eslint - no-non-null-assertion
    url: https://typescript-eslint.io/rules/no-non-null-assertion/
  - title: TypeScript Handbook - Everyday Types (non-null assertion operator)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Narrow nullable values with checks instead of `!`; the assertion is erased and never verified at runtime.

## Why

The `!` operator is a promise to the checker that a value is present, with no runtime check behind it. When the value is actually `null` or `undefined`, the failure moves to property access with a message that does not name the real defect.

## Bad

```typescript
function initials(name?: string): string {
  return name!.trim().slice(0, 1);
}
```

## Good

```typescript
function initials(name?: string): string {
  if (name === undefined) {
    return "";
  }
  return name.trim().slice(0, 1);
}
```

## See Also

- [typescript-type-optional-not-undefined](type-optional-not-undefined.md) - representing absence without overloading `undefined`
- [typescript-type-indexed-access-guard](type-indexed-access-guard.md) - the indexed-access case of the same hazard

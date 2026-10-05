---
id: typescript-type-unsafe-cast
lang: typescript
prefix: type
title: Narrow with guards instead of asserting a narrower type
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/no-unsafe-type-assertion"
baseline: latest
status: verified
triggers:
  keywords: [assertion, as, cast, narrowing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [as]
related: [typescript-type-no-explicit-any, typescript-err-boundary-parse]
sources:
  - title: typescript-eslint - no-unsafe-type-assertion
    url: https://typescript-eslint.io/rules/no-unsafe-type-assertion/
  - title: TypeScript Handbook - Everyday Types (type assertions)
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
---
> Narrow a union with guards instead of asserting a narrower type; assertions are erased at runtime.

## Why

A type assertion tells the checker what the developer believes, not what the value is, and it disappears from the emitted code. When the belief is wrong the failure surfaces later at the use site, far from the assertion, with no check to stop it.

## Bad

```typescript
function responseBody(input: string | string[]): string {
  return (input as string).trim();
}
```

## Good

```typescript
function responseBody(input: string | string[]): string {
  if (typeof input === "string") {
    return input.trim();
  }
  return input.join(",");
}
```

## See Also

- [typescript-type-no-explicit-any](type-no-explicit-any.md) - the other way checking gets switched off
- [typescript-err-boundary-parse](err-boundary-parse.md) - parsing untrusted input into a proven shape

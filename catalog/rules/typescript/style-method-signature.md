---
id: typescript-style-method-signature
lang: typescript
prefix: style
title: Declare callable properties with function-type syntax
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/method-signature-style"
baseline: latest
status: verified
triggers:
  keywords: [method signature, function property, bivariance]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-api-interface-for-objects]
sources:
  - title: typescript-eslint - method-signature-style
    url: https://typescript-eslint.io/rules/method-signature-style/
---
> Declare callable properties as `handle: (value: string) => void` so parameters are checked contravariantly.

## Why

Method shorthand is bivariant in its arguments even under `strictFunctionTypes`, so it accepts narrower parameter types that the property form rejects; the function-type syntax gets the strict contravariant check. Using one form consistently also keeps the strictness from changing when a declaration is rewritten.

## Bad

```typescript
export interface Handler {
  handle(value: string): void;
}

export function run(handler: Handler): void {
  handler.handle("value");
}
```

## Good

```typescript
export interface Handler {
  handle: (value: string) => void;
}

export function run(handler: Handler): void {
  handler.handle("value");
}
```

## See Also

- [typescript-api-interface-for-objects](api-interface-for-objects.md) - the interface shapes these callable properties are declared on

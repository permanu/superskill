---
id: typescript-style-arrow-callbacks
lang: typescript
prefix: style
title: Pass arrow functions as callbacks
severity: prefer
enforce: tool
tool: "eslint:prefer-arrow-callback"
baseline: latest
status: verified
triggers:
  keywords: [arrow function, callback, this]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-lint-no-this-alias]
sources:
  - title: ESLint - prefer-arrow-callback
    url: https://eslint.org/docs/latest/rules/prefer-arrow-callback/
  - title: Google TypeScript Style Guide
    url: https://google.github.io/styleguide/tsguide.html
---
> Write inline callbacks as arrow functions so they keep the enclosing `this` and read as expressions.

## Why

A function expression gets its own `this`, which is why callbacks written that way need aliases or `bind` to reach the surrounding object; arrow functions keep the enclosing receiver and stay short at the call site. Named function declarations remain the form for reusable functions.

## Bad

```typescript
export function doubled(values: number[]): number[] {
  return values.map(function (value) {
    return value * 2;
  });
}
```

## Good

```typescript
export function doubled(values: number[]): number[] {
  return values.map((value) => value * 2);
}
```

## See Also

- [typescript-lint-no-this-alias](lint-no-this-alias.md) - the this-aliasing that function-expression callbacks force

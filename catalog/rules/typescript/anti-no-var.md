---
id: typescript-anti-no-var
lang: typescript
prefix: anti
title: Declare variables with let or const, never var
severity: should
enforce: tool
tool: "eslint:no-var"
baseline: latest
status: verified
triggers:
  keywords: [var, block scope, hoisting]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [var]
related: [typescript-style-const-default]
sources:
  - title: ESLint - no-var
    url: https://eslint.org/docs/latest/rules/no-var/
  - title: MDN - var
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var
---
> Declare every variable with `let` or `const` so its scope is the block, not the whole function.

## Why

`var` is function-scoped and hoisted, so it leaks out of blocks, redeclares silently, and reads as `undefined` before its assignment runs. `let` and `const` scope to the block and turn redeclaration into an error, so the variable's lifetime matches where it is written.

## Bad

```typescript
export function total(): number {
  var sum = 0;
  for (var index = 0; index < 3; index += 1) {
    sum += index;
  }
  return sum;
}
```

## Good

```typescript
export function total(): number {
  let sum = 0;
  for (let index = 0; index < 3; index += 1) {
    sum += index;
  }
  return sum;
}
```

## See Also

- [typescript-style-const-default](style-const-default.md) - choosing const for bindings that never change

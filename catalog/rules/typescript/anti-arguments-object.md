---
id: typescript-anti-arguments-object
lang: typescript
prefix: anti
title: Take variadic arguments as rest parameters, not the arguments object
severity: should
enforce: tool
tool: "eslint:prefer-rest-params"
baseline: latest
status: verified
triggers:
  keywords: [arguments object, rest parameters, variadic]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [arguments]
related: [typescript-api-iterable-params]
sources:
  - title: ESLint - prefer-rest-params
    url: https://eslint.org/docs/latest/rules/prefer-rest-params/
  - title: MDN - arguments
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
---
> Declare variadic parameters with `...rest` instead of reading the `arguments` object.

## Why

`arguments` is an array-like object with no array methods, it exists only in non-arrow functions, and it collects every argument whether the signature declares it or not. Rest parameters are a real, typed array, so the function's contract is visible in its signature and the values can be used directly.

## Bad

```typescript
export function sum(): number {
  let total = 0;
  for (let index = 0; index < arguments.length; index += 1) {
    total += arguments[index];
  }
  return total;
}
```

## Good

```typescript
export function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
```

## See Also

- [typescript-api-iterable-params](api-iterable-params.md) - typing the values a function accepts instead of reading them untyped

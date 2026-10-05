---
id: typescript-anti-for-in-array
lang: typescript
prefix: anti
title: Iterate arrays with for...of, not for...in
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-for-in-array"
baseline: latest
status: verified
triggers:
  keywords: [for...in, for...of, array iteration]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [for...in, for...of]
related: [typescript-anti-has-own]
sources:
  - title: typescript-eslint - no-for-in-array
    url: https://typescript-eslint.io/rules/no-for-in-array/
  - title: MDN - for...in
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in
---
> Iterate array values with `for...of`; reserve `for...in` for enumerable object keys.

## Why

`for...in` yields every enumerable string key, including inherited ones, so the loop sees keys rather than values and its results change when the prototype chain changes. `for...of` walks the values in order, which is what array iteration means.

## Bad

```typescript
export function joined(values: number[]): string {
  let result = "";
  for (const key in values) {
    result += `${key},`;
  }
  return result;
}
```

## Good

```typescript
export function joined(values: number[]): string {
  let result = "";
  for (const value of values) {
    result += `${value},`;
  }
  return result;
}
```

## See Also

- [typescript-anti-has-own](anti-has-own.md) - checking own properties when enumerating keys

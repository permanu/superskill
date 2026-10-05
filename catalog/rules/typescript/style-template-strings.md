---
id: typescript-style-template-strings
lang: typescript
prefix: style
title: Interpolate with template literals, not string concatenation
severity: prefer
enforce: tool
tool: "eslint:prefer-template"
baseline: latest
status: verified
triggers:
  keywords: [template literal, string interpolation, concatenation]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-sec-no-user-regex]
sources:
  - title: ESLint - prefer-template
    url: https://eslint.org/docs/latest/rules/prefer-template/
  - title: MDN - Template literals
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
---
> Build strings with template literals instead of `+` concatenation when a value is interpolated.

## Why

Concatenation hides where each value enters the string and forces the author to manage spacing between pieces. A template literal shows the final text in one piece, and each interpolation converts through the string rules at the exact position it appears.

## Bad

```typescript
export function label(count: number): string {
  return "count: " + count;
}
```

## Good

```typescript
export function label(count: number): string {
  return `count: ${count}`;
}
```

## See Also

- [typescript-sec-no-user-regex](sec-no-user-regex.md) - escaping interpolated values before they become a pattern

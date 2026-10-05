---
id: typescript-style-object-spread
lang: typescript
prefix: style
title: Copy objects with spread, not Object.assign
severity: prefer
enforce: tool
tool: "eslint:prefer-object-spread"
baseline: latest
status: verified
triggers:
  keywords: [object spread, Object.assign, copy]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.assign]
related: [typescript-sec-no-merge-untrusted]
sources:
  - title: ESLint - prefer-object-spread
    url: https://eslint.org/docs/latest/rules/prefer-object-spread/
---
> Build a new object with `{ ...source, key: value }` instead of `Object.assign` on an empty literal.

## Why

Spread reads as the object's final shape in one expression, while `Object.assign({}, a, b)` requires counting arguments to know which properties win. Both copy own enumerable properties, so the spread form loses nothing and keeps the precedence visible.

## Bad

```typescript
export function withRetries(options: { timeout: number }): { timeout: number; retries: number } {
  return Object.assign({}, options, { retries: 3 });
}
```

## Good

```typescript
export function withRetries(options: { timeout: number }): { timeout: number; retries: number } {
  return { ...options, retries: 3 };
}
```

## See Also

- [typescript-sec-no-merge-untrusted](sec-no-merge-untrusted.md) - building option objects from known keys instead of merged input

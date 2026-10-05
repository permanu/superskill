---
id: typescript-style-const-default
lang: typescript
prefix: style
title: Declare variables with const by default
severity: should
enforce: tool
tool: "eslint:prefer-const"
baseline: latest
status: verified
triggers:
  keywords: [const, let, reassignment]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [const, let]
related: [typescript-anti-no-var]
sources:
  - title: ESLint - prefer-const
    url: https://eslint.org/docs/latest/rules/prefer-const/
  - title: Google TypeScript Style Guide
    url: https://google.github.io/styleguide/tsguide.html
---
> Use `const` for every binding that is never reassigned and `let` only when reassignment happens.

## Why

`const` fixes the binding, so a later assignment becomes a compile error instead of a silent state change; `let` stays available for the variables that genuinely change. The declaration tells the reader which kind of value to expect without reading the rest of the function.

## Bad

```typescript
export function label(): string {
  let text = "value";
  return text;
}
```

## Good

```typescript
export function label(): string {
  const text = "value";
  return text;
}
```

## See Also

- [typescript-anti-no-var](anti-no-var.md) - removing the function-scoped declaration form entirely

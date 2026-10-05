---
id: typescript-const-default-parameter
lang: typescript
prefix: const
title: Give optional parameters their default in the signature
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default parameter, optional, signature]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-const-fresh-default, typescript-lint-prefer-nullish-coalescing]
sources:
  - title: MDN - Default parameters
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters
---
> Put a parameter's default in the signature instead of recreating it inside the body.

## Why

A default in the signature shows every caller what an omitted argument means and keeps the value in one place; a body fallback repeats the decision wherever the parameter is read and can drift from the documented default.

## Bad

```typescript
export function retries(count?: number): number {
  return count ?? 3;
}
```

## Good

```typescript
export function retries(count = 3): number {
  return count;
}
```

## See Also

- [typescript-const-fresh-default](const-fresh-default.md) - keeping the default expression safe to share
- [typescript-lint-prefer-nullish-coalescing](lint-prefer-nullish-coalescing.md) - the fallback operator when a default is not in the signature

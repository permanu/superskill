---
id: typescript-const-fresh-default
lang: typescript
prefix: const
title: Never share a mutable default parameter value
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default parameter, mutable default, shared state]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-const-default-parameter, typescript-anti-param-reassign]
sources:
  - title: MDN - Default parameters
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters
---
> Use a fresh literal as a parameter default; a shared array or object default accumulates every call's mutations.

## Why

The default expression is evaluated for each call that omits the argument, so a literal default creates a new value while a module-level array default is the same object every time. Mutations through that shared default leak between unrelated callers.

## Bad

```typescript
const defaults: string[] = [];

export function add(value: string, values: string[] = defaults): string[] {
  values.push(value);
  return values;
}
```

## Good

```typescript
export function add(value: string, values: string[] = []): string[] {
  values.push(value);
  return values;
}
```

## See Also

- [typescript-const-default-parameter](const-default-parameter.md) - where the default belongs in the signature
- [typescript-anti-param-reassign](anti-param-reassign.md) - not reassigning the parameter itself

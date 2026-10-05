---
id: typescript-api-immutable-exports
lang: typescript
prefix: api
title: Never export a mutable binding
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [export let, mutable, binding, getter]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [export]
related: [typescript-api-minimal-surface, typescript-api-named-exports]
sources:
  - title: Google TypeScript Style Guide (mutable exports)
    url: https://google.github.io/styleguide/tsguide.html
---
> Never export a mutable binding; expose getters and setters so importers see every change.

## Why

A re-exported mutable binding does not propagate assignments to consumers in all module formats, so importers can observe a stale value while the exporting module holds the new one. Functions keep the binding private and make reads and writes explicit through the module boundary.

## Bad

```typescript
export let retries = 3;

export function setRetries(value: number): void {
  retries = value;
}
```

## Good

```typescript
let retries = 3;

export function getRetries(): number {
  return retries;
}

export function setRetries(value: number): void {
  retries = value;
}
```

## See Also

- [typescript-api-minimal-surface](api-minimal-surface.md) - deciding what the module exposes
- [typescript-api-named-exports](api-named-exports.md) - the export form that pairs with this rule

---
id: typescript-const-object-freeze
lang: typescript
prefix: const
title: Freeze exported constant objects and arrays
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Object.freeze, constants, mutation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.freeze]
related: [typescript-type-const-assertion, typescript-api-immutable-exports]
sources:
  - title: MDN - Object.freeze
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object.freeze
---
> Wrap exported constants in `Object.freeze` so no importer can rewrite the shared value at runtime.

## Why

`const` fixes the binding, not the contents: any importer can still assign to a property or push onto a shared array, and every other holder sees the change. `Object.freeze` makes those writes fail at runtime, while `as const` only stops them in typed code.

## Bad

```typescript
export const defaults = {
  retries: 3,
};

export function override(): void {
  defaults.retries = 5;
}
```

## Good

```typescript
export const defaults = Object.freeze({
  retries: 3,
});

export function retries(): number {
  return defaults.retries;
}
```

## See Also

- [typescript-type-const-assertion](type-const-assertion.md) - the compile-time half of the same guarantee
- [typescript-api-immutable-exports](api-immutable-exports.md) - keeping the exported binding itself stable

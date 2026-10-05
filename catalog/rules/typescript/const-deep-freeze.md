---
id: typescript-const-deep-freeze
lang: typescript
prefix: const
title: Freeze nested constants deeply
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deep freeze, nested, readonly]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Object.freeze]
related: [typescript-const-object-freeze, typescript-type-readonly-inputs]
sources:
  - title: MDN - Object.freeze
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object.freeze
  - title: TypeScript Handbook - Object Types (readonly properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> `Object.freeze` is shallow; freeze nested objects too or type them readonly.

## Why

Freezing an object makes only its own properties non-writable, so a nested object stays fully mutable through the frozen parent. A deep freeze, or a `DeepReadonly` type, extends the guarantee to every level.

## Bad

```typescript
export const limits = Object.freeze({
  request: { max: 100 },
});

export function raise(): void {
  limits.request.max = 500;
}
```

## Good

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

declare function deepFreeze<T>(value: T): DeepReadonly<T>;

export const limits = deepFreeze({
  request: { max: 100 },
});

export function maxRequests(): number {
  return limits.request.max;
}
```

## See Also

- [typescript-const-object-freeze](const-object-freeze.md) - the shallow freeze this rule extends
- [typescript-type-readonly-inputs](type-readonly-inputs.md) - readonly types at the parameter boundary

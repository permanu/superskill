---
id: typescript-const-readonly-props
lang: typescript
prefix: const
title: Mark data-model properties readonly
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [readonly, data model, immutability]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [readonly]
related: [typescript-api-readonly-fields, typescript-const-object-freeze]
sources:
  - title: TypeScript Handbook - Object Types (readonly properties)
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
---
> Mark a model property readonly when updates should create a new value instead of mutating the shared object.

## Why

A writable property lets any holder of the object change state that others are reading; `readonly` makes in-place assignment a compile error and pushes updates into explicit new objects. The check is type-level, so it costs nothing at runtime.

## Bad

```typescript
export interface Point {
  x: number;
  y: number;
}

export function moveX(point: Point, x: number): Point {
  point.x = x;
  return point;
}
```

## Good

```typescript
export interface Point {
  readonly x: number;
  readonly y: number;
}

export function moveX(point: Point, x: number): Point {
  return { ...point, x };
}
```

## See Also

- [typescript-api-readonly-fields](api-readonly-fields.md) - the class-field version of the same decision
- [typescript-const-object-freeze](const-object-freeze.md) - the runtime freeze for values that are shared

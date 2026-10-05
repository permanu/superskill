---
id: typescript-style-generic-constructors
lang: typescript
prefix: style
title: Put generic arguments on the constructor call, not the annotation
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/consistent-generic-constructors"
baseline: latest
status: verified
triggers:
  keywords: [generic arguments, constructor, type annotation]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Map]
related: [typescript-style-array-type]
sources:
  - title: typescript-eslint - consistent-generic-constructors
    url: https://typescript-eslint.io/rules/consistent-generic-constructors/
---
> Write `new Map<string, number>()` instead of annotating `new Map()` with the generic type.

## Why

When the type arguments appear on the constructor call, the variable picks up the exact type from the expression and needs no annotation; repeating the type in two places means the next edit has to keep both in sync. Choosing one side keeps every generic construction readable the same way.

## Bad

```typescript
const lookup: Map<string, number> = new Map();
export const size: number = lookup.size;
```

## Good

```typescript
const lookup = new Map<string, number>();
export const size: number = lookup.size;
```

## See Also

- [typescript-style-array-type](style-array-type.md) - the other rule about where type arguments are written

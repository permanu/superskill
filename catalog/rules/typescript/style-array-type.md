---
id: typescript-style-array-type
lang: typescript
prefix: style
title: Write simple array types as T[]
severity: prefer
enforce: tool
tool: "eslint:@typescript-eslint/array-type"
baseline: latest
status: verified
triggers:
  keywords: [array type, "T[]", Array generic]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-style-generic-constructors]
sources:
  - title: typescript-eslint - array-type
    url: https://typescript-eslint.io/rules/array-type/
  - title: Google TypeScript Style Guide
    url: https://google.github.io/styleguide/tsguide.html
---
> Use `T[]` for simple element types and `Array<T>` when the element type needs its own brackets.

## Why

The two spellings are equivalent, so mixing them makes the reader check whether the difference was intentional. `string[]` reads left to right, while `Array<string | number>` keeps a compound element type readable inside its own brackets.

## Bad

```typescript
const values: Array<string> = ["a"];
export const first: string = values[0];
```

## Good

```typescript
const values: string[] = ["a"];
export const first: string = values[0];
```

## See Also

- [typescript-style-generic-constructors](style-generic-constructors.md) - where generic type arguments belong on a constructor call

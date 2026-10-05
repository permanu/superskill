---
id: typescript-api-no-static-class
lang: typescript
prefix: api
title: Use plain functions instead of a class that only holds static helpers
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [static, helper, class, function]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [static]
related: [typescript-api-modules-over-namespaces, typescript-api-minimal-surface]
sources:
  - title: TypeScript Handbook - Classes (why no static classes)
    url: https://www.typescriptlang.org/docs/handbook/2/classes.html
  - title: Google TypeScript Style Guide (container classes)
    url: https://google.github.io/styleguide/tsguide.html
---
> Use plain functions instead of a class that only holds static helpers.

## Why

A class with only static members is a namespace in disguise: it exists solely to group functions, and it adds a construct with no instances to instantiate, extend, or test in isolation. Module-scope functions group the same code with the module system as the namespace.

## Bad

```typescript
export class DateUtils {
  static isWeekend(day: number): boolean {
    return day === 0 || day === 6;
  }
}
```

## Good

```typescript
export function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}
```

## See Also

- [typescript-api-modules-over-namespaces](api-modules-over-namespaces.md) - the module as the grouping unit
- [typescript-api-minimal-surface](api-minimal-surface.md) - exporting the functions that consumers use

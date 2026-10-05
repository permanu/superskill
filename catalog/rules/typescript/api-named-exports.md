---
id: typescript-api-named-exports
lang: typescript
prefix: api
title: Export named symbols instead of default exports
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [default export, named export, module]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [export]
related: [typescript-api-minimal-surface, typescript-api-modules-over-namespaces]
sources:
  - title: Google TypeScript Style Guide (exports)
    url: https://google.github.io/styleguide/tsguide.html
---
> Export named symbols; default exports have no canonical name and resist refactoring.

## Why

A default export can be imported under any name, so consumers refer to the same value by different identifiers and a rename is invisible to them. Named exports fail at compile time when the name does not exist and let editors rename the symbol across every importer.

## Bad

```typescript
export default class UserService {
  find(id: string): string {
    return id;
  }
}
```

## Good

```typescript
export class UserService {
  find(id: string): string {
    return id;
  }
}
```

## See Also

- [typescript-api-minimal-surface](api-minimal-surface.md) - deciding what deserves an export
- [typescript-api-modules-over-namespaces](api-modules-over-namespaces.md) - files as the unit of export

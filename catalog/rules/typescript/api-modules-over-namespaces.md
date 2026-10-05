---
id: typescript-api-modules-over-namespaces
lang: typescript
prefix: api
title: Put each module's API in its own file, not a namespace
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [namespace, module, file, export]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [namespace]
related: [typescript-api-named-exports, typescript-api-minimal-surface]
sources:
  - title: Google TypeScript Style Guide (use modules not namespaces)
    url: https://google.github.io/styleguide/tsguide.html
  - title: TypeScript Handbook - Modules
    url: https://www.typescriptlang.org/docs/handbook/2/modules.html
---
> Put each module's API in its own file; do not group exports inside a namespace.

## Why

Namespaces are a TypeScript-only construct that bundlers and module-aware tooling do not treat as module boundaries, so imports, tree shaking, and dependency graphs stop working. Files are the module unit the ecosystem understands, and named exports from a file give the same grouping without a custom construct.

## Bad

```typescript
namespace MathUtils {
  export function double(value: number): number {
    return value * 2;
  }
}
```

## Good

```typescript
export function double(value: number): number {
  return value * 2;
}
```

## See Also

- [typescript-api-named-exports](api-named-exports.md) - the export form that replaces namespace members
- [typescript-api-minimal-surface](api-minimal-surface.md) - what a module file should expose

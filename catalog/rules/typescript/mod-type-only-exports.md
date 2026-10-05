---
id: typescript-mod-type-only-exports
lang: typescript
prefix: mod
title: Mark type-only re-exports with the type keyword
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/consistent-type-exports"
baseline: latest
status: verified
triggers:
  keywords: [export type, type-only export, re-export]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [export]
related: [typescript-mod-type-only-imports, typescript-mod-erasable-syntax]
sources:
  - title: typescript-eslint - consistent-type-exports
    url: https://typescript-eslint.io/rules/consistent-type-exports/
  - title: TypeScript - isolatedModules (exports of non-value identifiers)
    url: https://www.typescriptlang.org/tsconfig/isolatedModules.html
  - title: TypeScript - verbatimModuleSyntax
    url: https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html
---
> Re-export types with `export type` so the emitted module never exports a name that has no runtime value.

## Why

`export { User }` where `User` is an interface emits an export that does not exist at runtime, so single-file transpilers and Node type stripping fail even though the compiler accepts it. `export type` marks the symbol as type-only, and the whole export is erased from the emitted JavaScript.

## Bad

```typescript
interface User {
  id: string;
}

export { User };
```

## Good

```typescript
interface User {
  id: string;
}

export type { User };
```

## See Also

- [typescript-mod-type-only-imports](mod-type-only-imports.md) - the import side of the same distinction
- [typescript-mod-erasable-syntax](mod-erasable-syntax.md) - keeping modules runnable under type stripping

---
id: typescript-mod-type-only-imports
lang: typescript
prefix: mod
title: Mark type-only imports with the type keyword
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/consistent-type-imports"
baseline: latest
status: verified
triggers:
  keywords: [import type, type-only import, verbatimModuleSyntax]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-type-only-exports, typescript-mod-erasable-syntax]
sources:
  - title: typescript-eslint - consistent-type-imports
    url: https://typescript-eslint.io/rules/consistent-type-imports/
  - title: TypeScript - verbatimModuleSyntax
    url: https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html
  - title: Node.js - Modules - TypeScript (importing types without the type keyword)
    url: https://nodejs.org/api/typescript.html
---
> Import type-only symbols with `import type` so transpilers and Node drop them without resolving a runtime value.

## Why

A symbol imported only for annotations still looks like a runtime import to a single-file transpiler, so it survives into the emitted module and fails when no runtime value exists. Node type stripping treats the import as a value import for the same reason. `import type` states that the symbol never exists at runtime, which lets the compiler, bundlers, and `verbatimModuleSyntax` drop it cleanly.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { User } from "./user.js";

export function id(user: User): string {
  return user.id;
}
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import type { User } from "./user.js";

export function id(user: User): string {
  return user.id;
}
```

## See Also

- [typescript-mod-type-only-exports](mod-type-only-exports.md) - the export side of the same distinction
- [typescript-mod-erasable-syntax](mod-erasable-syntax.md) - keeping modules runnable under type stripping

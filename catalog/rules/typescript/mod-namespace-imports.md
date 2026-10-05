---
id: typescript-mod-namespace-imports
lang: typescript
prefix: mod
title: Import the symbols you use by name, not a namespace for one call
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [namespace import, named import, import *]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-type-only-imports, typescript-api-named-exports]
sources:
  - title: Google TypeScript Style Guide - namespace versus named imports
    url: https://google.github.io/styleguide/tsguide.html
---
> Use named imports for the symbols a file calls; use a namespace import only when many names come from one large API.

## Why

A namespace import binds every export and forces a module prefix at each call site, which is noise when a file uses one or two symbols. The prefix earns its place when a large API exports generic names that would otherwise need aliases at the import statement.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import * as format from "./format.js";

export function label(value: string): string {
  return format.format(value);
}
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import { format } from "./format.js";

export function label(value: string): string {
  return format(value);
}
```

## See Also

- [typescript-mod-type-only-imports](mod-type-only-imports.md) - choosing the form of the import statement
- [typescript-api-named-exports](api-named-exports.md) - the matching choice for the exporting module

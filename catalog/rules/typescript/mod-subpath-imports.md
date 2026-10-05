---
id: typescript-mod-subpath-imports
lang: typescript
prefix: mod
title: Alias internal modules with package imports, not deep relative paths
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [subpath imports, "# alias", package imports]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-public-entry, typescript-mod-file-extensions]
sources:
  - title: Node.js - Modules - Packages (subpath imports)
    url: https://nodejs.org/api/packages.html
---
> Define `#`-prefixed package imports for internal aliases instead of reaching through deep relative paths.

## Why

A deep relative path encodes the current folder layout into every caller, so moving one module breaks unrelated files. The package `imports` field maps a stable `#name` to the real file and is resolved by Node for every module inside the package, keeping a layout change local to one configuration entry.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { format } from "../../lib/format.js";

export function label(value: string): string {
  return format(value);
}
```

## Good

```typescript
// @ts-expect-error: resolved at runtime via package imports
import { format } from "#lib/format.js";

export function label(value: string): string {
  return format(value);
}
```

## See Also

- [typescript-mod-public-entry](mod-public-entry.md) - the same boundary applied to other packages
- [typescript-mod-file-extensions](mod-file-extensions.md) - writing the exact specifier the runtime resolves

---
id: typescript-mod-public-entry
lang: typescript
prefix: mod
title: Import packages through their public entry point
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [deep import, package entry, exports field]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-subpath-imports, typescript-api-minimal-surface]
sources:
  - title: Node.js - Modules - Packages ("exports" field)
    url: https://nodejs.org/api/packages.html
---
> Import a dependency through its declared entry point instead of reaching into its published files.

## Why

The `exports` field defines a package's public entry points and encapsulates everything else, so a deep import into its file tree bypasses the boundary the package author declared and breaks when the internals move. Importing the package name keeps the dependency on the published contract.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { format } from "date-library/dist/internal/format.js";

export function label(value: string): string {
  return format(value);
}
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import { format } from "date-library";

export function label(value: string): string {
  return format(value);
}
```

## See Also

- [typescript-mod-subpath-imports](mod-subpath-imports.md) - the same boundary for your own package internals
- [typescript-api-minimal-surface](api-minimal-surface.md) - publishing only the entry points consumers need

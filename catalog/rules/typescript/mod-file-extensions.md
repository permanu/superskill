---
id: typescript-mod-file-extensions
lang: typescript
prefix: mod
title: Import relative ESM paths with their file extension
severity: must
enforce: tool
tool: "tsc:moduleResolution"
baseline: latest
status: verified
triggers:
  keywords: [file extension, ESM specifier, relative import]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-lazy-dynamic-import, typescript-mod-import-attributes]
sources:
  - title: Node.js - Modules - ECMAScript modules (mandatory file extensions)
    url: https://nodejs.org/api/esm.html
  - title: Node.js - Modules - TypeScript (determining module system)
    url: https://nodejs.org/api/typescript.html
---
> Write relative ESM imports with the exact file extension the runtime resolves, including `.js` for TypeScript sources.

## Why

ESM resolves specifiers as URLs, so Node does not guess a missing extension and fails with ERR_MODULE_NOT_FOUND; the TypeScript compiler rejects the same import under `node16` or `nodenext` resolution. Naming the emitted file keeps one specifier valid for both the compiler and the runtime.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { format } from "./format";

export function label(value: string): string {
  return format(value);
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

- [typescript-mod-lazy-dynamic-import](mod-lazy-dynamic-import.md) - dynamic imports follow the same specifier rules
- [typescript-mod-import-attributes](mod-import-attributes.md) - the other specifier qualifier Node requires

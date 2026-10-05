---
id: typescript-mod-no-require
lang: typescript
prefix: mod
title: Use ES imports instead of require in module code
severity: should
enforce: tool
tool: "eslint:@typescript-eslint/no-require-imports"
baseline: latest
status: verified
triggers:
  keywords: [require, import equals, CommonJS]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [require]
related: [typescript-mod-node-builtin-prefix, typescript-mod-type-only-imports]
sources:
  - title: typescript-eslint - no-require-imports
    url: https://typescript-eslint.io/rules/no-require-imports/
  - title: Node.js - Modules - TypeScript (determining module system)
    url: https://nodejs.org/api/typescript.html
---
> Import with ES module syntax instead of `require()` or `import x = require()`.

## Why

`require()` and `import =` are CommonJS syntax: Node does not convert a file between module systems, so a require call in an ESM file is a runtime error. The call is also invisible to the static module graph that bundlers and tree shakers build, while the ES import form declares the dependency in syntax every tool can read and compiles to require when the output target is CommonJS.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import fs = require("node:fs");

export const reader: unknown = fs;
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import { readFileSync } from "node:fs";

export function read(path: string): string {
  return readFileSync(path, "utf8");
}
```

## See Also

- [typescript-mod-node-builtin-prefix](mod-node-builtin-prefix.md) - the specifier form for built-ins
- [typescript-mod-type-only-imports](mod-type-only-imports.md) - marking imports that have no runtime value

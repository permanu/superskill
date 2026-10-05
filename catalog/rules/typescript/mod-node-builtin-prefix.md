---
id: typescript-mod-node-builtin-prefix
lang: typescript
prefix: mod
title: "Import Node built-ins with the node: prefix"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["node: prefix", built-in module, node:fs]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: ["node:"]
related: [typescript-mod-no-require, typescript-mod-file-extensions]
sources:
  - title: "Node.js - Modules - Built-in modules with mandatory node: prefix"
    url: https://nodejs.org/api/modules.html
  - title: "Node.js - Modules - ECMAScript modules (node: imports)"
    url: https://nodejs.org/api/esm.html
---
> Import Node built-in modules with the `node:` prefix so the target is unambiguous to Node and bundlers.

## Why

Bare specifiers share a namespace with installed packages, which is why Node requires the `node:` prefix for newer builtins such as `node:test` and `node:sqlite` to keep them from conflicting with user-land names. The prefix also tells bundlers and loaders that the import targets the Node runtime instead of a package named `fs` or `path`.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { readFileSync } from "fs";

export function read(path: string): string {
  return readFileSync(path, "utf8");
}
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

- [typescript-mod-no-require](mod-no-require.md) - using ES imports instead of require()
- [typescript-mod-file-extensions](mod-file-extensions.md) - writing specifiers the runtime resolves exactly

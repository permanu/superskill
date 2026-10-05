---
id: typescript-io-path-join
lang: typescript
prefix: io
title: Join filesystem paths with the path module
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path.join, separator, filesystem]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-mod-node-builtin-prefix, typescript-io-url-encode]
sources:
  - title: Node.js - Path
    url: https://nodejs.org/api/path.html
---
> Build filesystem paths with `path.join` instead of concatenating separators by hand.

## Why

Hand-built paths hard-code `/`, break on platforms whose separator differs, and double or drop separators when a segment already ends with one. `path.join` uses the platform separator and normalizes the result.

## Bad

```typescript
export function configPath(root: string, name: string): string {
  return `${root}/${name}`;
}
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import { join } from "node:path";

export function configPath(root: string, name: string): string {
  return join(root, name);
}
```

## See Also

- [typescript-mod-node-builtin-prefix](mod-node-builtin-prefix.md) - importing the path module with the node: prefix
- [typescript-io-url-encode](io-url-encode.md) - the URL equivalent for web addresses

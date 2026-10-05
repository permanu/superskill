---
id: typescript-mod-import-attributes
lang: typescript
prefix: mod
title: Load JSON modules with a type attribute
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import attributes, JSON module, with type]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [with]
related: [typescript-mod-file-extensions, typescript-mod-lazy-dynamic-import]
sources:
  - title: Node.js - Modules - ECMAScript modules (import attributes)
    url: https://nodejs.org/api/esm.html
  - title: MDN - import() (dynamic import options)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
---
> Import JSON with `with { type: "json" }` so Node loads it as a module instead of guessing the format.

## Why

Node requires the `type: "json"` attribute to import a JSON module, both statically and through `import()`, and fails the load without it. The attribute states the file's format at the specifier, so the loader does not have to infer it from the extension or content.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import data from "./data.json";

export const count: unknown = data;
```

## Good

```typescript
// @ts-expect-error: resolved at runtime by Node
import data from "./data.json" with { type: "json" };

export const count: unknown = data;
```

## See Also

- [typescript-mod-file-extensions](mod-file-extensions.md) - the exact specifier form Node requires
- [typescript-mod-lazy-dynamic-import](mod-lazy-dynamic-import.md) - passing attributes to dynamic imports

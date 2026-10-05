---
id: typescript-mod-lazy-dynamic-import
lang: typescript
prefix: mod
title: Load optional or heavy modules with dynamic import
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dynamic import, lazy loading, import()]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import]
related: [typescript-mod-file-extensions, typescript-async-parallelize-independent]
sources:
  - title: MDN - import() (dynamic import)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import
  - title: Node.js - Modules - ECMAScript modules (import() expressions)
    url: https://nodejs.org/api/esm.html
---
> Use dynamic `import()` for heavy or optional modules so their code loads only when that path runs.

## Why

A static import evaluates the module when the file loads, pulling optional dependencies and expensive initialization into every startup even when the feature is unused; dynamic imports are evaluated only when needed. The `import()` call returns a promise for the module namespace, so the loading point stays explicit in the code that uses it.

## Bad

```typescript
// @ts-expect-error: resolved at runtime by Node
import { renderChart } from "./chart.js";

export function showChart(): string {
  return renderChart();
}
```

## Good

```typescript
export async function showChart(): Promise<string> {
  // @ts-expect-error: resolved at runtime by Node
  const { renderChart } = await import("./chart.js");
  return renderChart();
}
```

## See Also

- [typescript-mod-file-extensions](mod-file-extensions.md) - dynamic import specifiers follow the same rules
- [typescript-async-parallelize-independent](async-parallelize-independent.md) - loading several modules in parallel instead of in sequence

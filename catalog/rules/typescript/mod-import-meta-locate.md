---
id: typescript-mod-import-meta-locate
lang: typescript
prefix: mod
title: Locate data files relative to the module, not the working directory
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [import.meta.url, cwd, file path]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [import.meta]
related: [typescript-mod-file-extensions]
sources:
  - title: Node.js - Modules - ECMAScript modules (import.meta.url)
    url: https://nodejs.org/api/esm.html
---
> Build file paths from `import.meta.url` so they resolve next to the module regardless of where the process starts.

## Why

`process.cwd()` is the directory the process was launched from, so a path built from it points at different files when the app is started by a service manager or a test runner. `import.meta.url` is the absolute URL of the module itself, which anchors sibling files to the code that reads them.

## Bad

```typescript
declare const process: { cwd(): string };

export function dataPath(): string {
  return `${process.cwd()}/data.json`;
}
```

## Good

```typescript
// @ts-expect-error: module context at runtime
const here: string = import.meta.url;

export function dataUrl(): URL {
  return new URL("./data.json", here);
}
```

## See Also

- [typescript-mod-file-extensions](mod-file-extensions.md) - resolving module paths the way the runtime does

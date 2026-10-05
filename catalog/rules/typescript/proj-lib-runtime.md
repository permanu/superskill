---
id: typescript-proj-lib-runtime
lang: typescript
prefix: proj
title: Scope lib to the runtime so foreign globals fail
severity: should
enforce: tool
tool: "tsc:lib"
baseline: latest
status: verified
triggers:
  keywords: [lib, DOM, runtime globals]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-mod-node-builtin-prefix]
sources:
  - title: TypeScript - lib
    url: https://www.typescriptlang.org/tsconfig/lib.html
---
> Set `lib` to the runtime's standard library so globals the runtime does not have fail to compile.

## Why

The default lib set includes DOM, so a Node service compiles against `document` and `window` and fails only when the code runs. Declaring the actual runtime libraries turns those references into compile errors where they are written.

## Bad

```typescript
export function heading(): string {
  return document.title;
}
```

## Good

```typescript
export function heading(source: { title: string }): string {
  return source.title;
}
```

## See Also

- [typescript-mod-node-builtin-prefix](mod-node-builtin-prefix.md) - the other place the runtime target shows up in the types

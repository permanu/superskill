---
id: typescript-mod-erasable-syntax
lang: typescript
prefix: mod
title: Keep TypeScript syntax erasable for runtime type stripping
severity: should
enforce: tool
tool: "tsc:erasableSyntaxOnly"
baseline: latest
status: verified
triggers:
  keywords: [type stripping, enum, namespace, parameter property]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [enum]
related: [typescript-mod-type-only-imports, typescript-mod-file-extensions]
sources:
  - title: TypeScript - erasableSyntaxOnly
    url: https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html
  - title: Node.js - Modules - TypeScript (type stripping)
    url: https://nodejs.org/api/typescript.html
---
> Avoid enums, runtime namespaces, parameter properties, and import-equals so Node and single-file transpilers can run the file by erasing types.

## Why

Node executes TypeScript directly by replacing type syntax with whitespace, so constructs that need code generation cannot run without a full compiler: enum declarations, namespaces with runtime code, parameter properties, and `import =`/`export =`. The `erasableSyntaxOnly` option makes the compiler reject those constructs at build time instead of failing at startup.

## Bad

```typescript
enum Color {
  Red = "red",
  Blue = "blue",
}

export function colorName(): string {
  return Color.Red;
}
```

## Good

```typescript
const Colors = {
  Red: "red",
  Blue: "blue",
} as const;

export function colorName(): string {
  return Colors.Red;
}
```

## See Also

- [typescript-mod-type-only-imports](mod-type-only-imports.md) - the type modifier that type stripping requires
- [typescript-mod-file-extensions](mod-file-extensions.md) - the other runtime rule for directly executed TypeScript

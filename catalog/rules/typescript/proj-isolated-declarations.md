---
id: typescript-proj-isolated-declarations
lang: typescript
prefix: proj
title: Annotate exported declarations for isolated declaration emit
severity: should
enforce: tool
tool: "tsc:isolatedDeclarations"
baseline: latest
status: verified
triggers:
  keywords: [isolatedDeclarations, declaration emit, annotation]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-api-explicit-return-types, typescript-proj-no-implicit-returns]
sources:
  - title: TypeScript - isolatedDeclarations
    url: https://www.typescriptlang.org/tsconfig/isolatedDeclarations.html
---
> Give exported declarations explicit types so each file's declaration output can be produced without the whole program.

## Why

Declaration emit normally infers an exported value's type from its initializer; `isolatedDeclarations` gives that inference up so each file's declaration output can be computed without the rest of the program, and exported values must carry their type instead. The flag makes the requirement a compile error rather than a build-pipeline failure.

## Bad

```typescript
export interface Config {
  retries: number;
}

declare function makeDefault(): Config;

export const config = makeDefault();
```

## Good

```typescript
export interface Config {
  retries: number;
}

declare function makeDefault(): Config;

export const config: Config = makeDefault();
```

## See Also

- [typescript-api-explicit-return-types](api-explicit-return-types.md) - annotating the public surface for its consumers
- [typescript-proj-no-implicit-returns](proj-no-implicit-returns.md) - the other option that removes an implicit path

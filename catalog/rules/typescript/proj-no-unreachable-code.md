---
id: typescript-proj-no-unreachable-code
lang: typescript
prefix: proj
title: Reject unreachable code
severity: should
enforce: tool
tool: "tsc:allowUnreachableCode"
baseline: latest
status: verified
triggers:
  keywords: [unreachable code, allowUnreachableCode, dead code]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-lint-no-unused-vars]
sources:
  - title: TypeScript - allowUnreachableCode
    url: https://www.typescriptlang.org/tsconfig/allowUnreachableCode.html
---
> Set `allowUnreachableCode` to `false` so statements after a terminating path fail the build.

## Why

Code after a `return` can never run, so it is either a leftover or a control-flow mistake, and it hides the fact that a branch is dead. Setting the option to `false` turns the compiler's editor suggestion into a build error.

## Bad

```typescript
export function status(): number {
  return 1;
  return 2;
}
```

## Good

```typescript
export function status(): number {
  return 1;
}
```

## See Also

- [typescript-lint-no-unused-vars](lint-no-unused-vars.md) - the other kind of code that the build should refuse to keep

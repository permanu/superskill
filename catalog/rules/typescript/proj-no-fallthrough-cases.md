---
id: typescript-proj-no-fallthrough-cases
lang: typescript
prefix: proj
title: Break every switch case instead of falling through
severity: should
enforce: tool
tool: "tsc:noFallthroughCasesInSwitch"
baseline: latest
status: verified
triggers:
  keywords: [switch, fallthrough, break]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [switch]
related: [typescript-type-exhaustive-union]
sources:
  - title: TypeScript - noFallthroughCasesInSwitch
    url: https://www.typescriptlang.org/tsconfig/noFallthroughCasesInSwitch.html
---
> End every non-empty case with `break`, `return`, or `throw` so no case runs into the next one.

## Why

A case without one of those statements runs into the following case, so the switch executes work the author did not attach to that label. The flag requires each case to end explicitly, which turns accidental fallthrough into a build error.

## Bad

```typescript
export function describe(kind: string): string {
  let result = "";
  switch (kind) {
    case "a":
      result += "a";
    case "b":
      result += "b";
      break;
  }
  return result;
}
```

## Good

```typescript
export function describe(kind: string): string {
  let result = "";
  switch (kind) {
    case "a":
      result += "a";
      break;
    case "b":
      result += "b";
      break;
  }
  return result;
}
```

## See Also

- [typescript-type-exhaustive-union](type-exhaustive-union.md) - covering every union member the switch handles

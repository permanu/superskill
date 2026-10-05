---
id: typescript-err-catch-unknown
lang: typescript
prefix: err
title: Treat caught values as unknown and narrow before reading them
severity: must
enforce: both
tool: "tsc:useUnknownInCatchVariables"
baseline: latest
status: verified
triggers:
  keywords: [catch, unknown, any, narrowing]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [catch, unknown]
related: [typescript-err-error-code, typescript-err-throw-error-only]
sources:
  - title: TSConfig Reference - useUnknownInCatchVariables
    url: https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html
  - title: typescript-eslint - use-unknown-in-catch-callback-variable
    url: https://typescript-eslint.io/rules/use-unknown-in-catch-callback-variable/
---
> Treat every caught value as `unknown` and narrow it with `instanceof` or a guard before use.

## Why

`any` in a catch clause switches off checking for the whole block and assumes a shape that a thrown value may not have. Any value can be thrown, so the honest type is `unknown`; narrowing restores precise access and keeps message extraction total.

## Bad

```typescript
function parsePort(raw: string): number {
  try {
    const port = JSON.parse(raw) as number;
    return port;
  } catch (e: any) {
    console.error(`parse failed: ${e.message}`);
    return 0;
  }
}
```

## Good

```typescript
function parsePort(raw: string): number {
  try {
    const port: unknown = JSON.parse(raw);
    if (typeof port !== "number" || !Number.isInteger(port)) {
      throw new Error("port must be an integer");
    }
    return port;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`parse failed: ${message}`);
    return 0;
  }
}
```

## See Also

- [typescript-err-error-code](err-error-code.md) - what to check after narrowing, instead of message text
- [typescript-err-throw-error-only](err-throw-error-only.md) - the throwing side of the same contract

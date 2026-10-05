---
id: typescript-obs-no-console-in-lib
lang: typescript
prefix: obs
title: Do not write to the console from library code
severity: should
enforce: tool
tool: "eslint:no-console"
baseline: latest
status: verified
triggers:
  keywords: [console, library, logging]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-obs-structured-log, typescript-api-minimal-surface]
sources:
  - title: ESLint - no-console
    url: https://eslint.org/docs/latest/rules/no-console/
---
> Leave logging to the application; a reusable module returns results instead of printing them.

## Why

A library that logs directly picks the application's output channel and floods it with internal detail the caller never asked for. Returning the value keeps the decision about what to record with the application, which owns the logging configuration.

## Bad

```typescript
export function parse(text: string): number {
  console.log(`parsing ${text.length} chars`);
  return text.length;
}
```

## Good

```typescript
export function parse(text: string): number {
  return text.length;
}
```

## See Also

- [typescript-obs-structured-log](obs-structured-log.md) - the logging the application should do instead
- [typescript-api-minimal-surface](api-minimal-surface.md) - keeping the library's behavior to its contract

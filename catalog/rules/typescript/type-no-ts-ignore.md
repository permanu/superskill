---
id: typescript-type-no-ts-ignore
lang: typescript
prefix: type
title: Use ts-expect-error with a reason instead of ts-ignore
severity: must
enforce: tool
tool: "eslint:@typescript-eslint/ban-ts-comment"
baseline: latest
status: verified
triggers:
  keywords: [ts-ignore, ts-expect-error, suppression, comment]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: []
related: [typescript-type-unsafe-cast, typescript-type-no-explicit-any]
sources:
  - title: typescript-eslint - ban-ts-comment
    url: https://typescript-eslint.io/rules/ban-ts-comment/
---
> Silence a type error with `@ts-expect-error` and a reason, never with `@ts-ignore`.

## Why

`@ts-ignore` suppresses whatever error appears on the next line, including errors introduced later by unrelated edits, and it carries no record of why the suppression was acceptable. `@ts-expect-error` fails the build when the expected error disappears, and the required description keeps the reason in the code.

## Bad

```typescript
// @ts-ignore
const port: number = "8080";
```

## Good

```typescript
// @ts-expect-error: the fixture intentionally violates the type
const port: number = "8080";
```

## See Also

- [typescript-type-unsafe-cast](type-unsafe-cast.md) - a suppression that should be replaced with a guard
- [typescript-type-no-explicit-any](type-no-explicit-any.md) - a suppression that should be replaced with `unknown`

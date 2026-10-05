---
id: typescript-err-parse-boundary
lang: typescript
prefix: err
title: Parse external input at the boundary
severity: must
enforce: review
baseline: TypeScript 5.9 / Node 26
status: verified
triggers:
  keywords: [parse, json, validate, boundary]
  files: ["**/*.ts"]
  symbols: [JSON.parse]
sources:
  - title: TypeScript Handbook - Narrowing
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---
> Parse external input once at the boundary, then pass typed values inward.

## Why

External data is unknown until proven. Parsing at the edge gives the rest of the program a value that already holds its invariant.

## Bad

```typescript
const body = req.body as { email: string };
```

## Good

```typescript
function parseEmail(input: unknown): string {
  if (typeof input !== "string") throw new Error("invalid input");
  return input;
}
```

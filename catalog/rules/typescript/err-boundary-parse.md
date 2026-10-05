---
id: typescript-err-boundary-parse
lang: typescript
prefix: err
title: Validate external data into typed values at the boundary before business logic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [boundary, parse, validate, unknown]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [unknown, JSON.parse]
related: [typescript-err-result-union, typescript-err-catch-unknown]
sources:
  - title: TypeScript Handbook - Narrowing
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---
> Parse external input once at the boundary; pass typed values, never raw `unknown`, into the core.

## Why

External data is `unknown` until proven, and an `as` assertion is erased at compile time. Parsing at the edge centralizes the guards, gives every downstream value a proven shape, and keeps validation out of business logic.

## Bad

```typescript
type CreateUser = { email: string };

function createUser(body: unknown): string {
  const input = body as CreateUser;
  return input.email.trim();
}
```

## Good

```typescript
type CreateUser = { email: string };

function parseCreateUser(body: unknown): CreateUser {
  if (typeof body !== "object" || body === null) {
    throw new Error("body must be an object");
  }
  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("email must be a valid address");
  }
  return { email };
}

function createUser(body: unknown): string {
  return parseCreateUser(body).email.trim();
}
```

## See Also

- [typescript-err-result-union](err-result-union.md) - returning parse failures as values instead of throwing
- [typescript-err-catch-unknown](err-catch-unknown.md) - treating input as unknown on the consuming side

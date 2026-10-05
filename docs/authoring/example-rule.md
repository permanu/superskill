This is a reference example of an atomic rule, kept outside `catalog/rules/` so the validator never scans it. Copy its structure, not its content.

---

```yaml
---
id: typescript-err-boundary-parse
lang: typescript
prefix: err
title: Parse external data into typed values at the boundary instead of trusting a cast
severity: should
enforce: review
baseline: latest
status: draft
triggers:
  keywords: [parse, validate, json, request, boundary]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [JSON.parse]
related: [typescript-type-parse-dont-validate]
sources:
  - title: TypeScript Handbook - Narrowing
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
---
> Parse external input once at the boundary, then pass typed values inward.

## Why

External data is `unknown` until proven. Validating in the middle of business logic spreads guards across every caller and lets invalid shapes leak. Parsing at the edge gives the rest of the code a value that already holds its invariant.

## Bad

```typescript
app.post("/users", (req, res) => {
  const body = req.body as { email: string };
  return createUser(body.email.trim());
});
```

## Good

```typescript
function parseCreateUser(input: unknown): { email: string } {
  if (typeof input !== "object" || input === null) throw new Error("body must be an object");
  const email = (input as { email?: unknown }).email;
  if (typeof email !== "string" || !email.includes("@")) throw new Error("invalid email");
  return { email };
}

app.post("/users", (req, res) => {
  const body = parseCreateUser(req.body);
  return createUser(body.email.trim());
});
```

## See Also

- [typescript-type-parse-dont-validate](type-parse-dont-validate.md) - the type-level companion to this rule
```

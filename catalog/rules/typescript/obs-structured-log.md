---
id: typescript-obs-structured-log
lang: typescript
prefix: obs
title: Log structured fields, not formatted strings
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [structured logging, fields, JSON]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-obs-interaction-id, typescript-obs-log-error-object]
sources:
  - title: OWASP Cheat Sheet Series - Logging
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Emit allowlisted structured fields; structure alone does not make a payload safe to log.

## Why

A formatted string cannot be filtered or aggregated by field. Structured records keep each attribute addressable, but arbitrary paths, URLs, identifiers and payload fields can leak secrets or personal data. Use static event names, route templates and allowlisted method/outcome values; omit raw inputs and errors by default.

## Bad

```typescript
export function logRequest(method: string, path: string): void {
  console.log(`${method} ${path}`);
}
```

## Good

```typescript
export function logRequest(method: string): void {
  const safeMethod = method === "GET" || method === "POST" ? method : "OTHER";
  console.log(JSON.stringify({ event: "request", method: safeMethod, route: "/accounts/:id" }));
}
```

## See Also

- [typescript-obs-interaction-id](obs-interaction-id.md) - the field that correlates records
- [typescript-obs-log-error-object](obs-log-error-object.md) - allowlisted error diagnostics

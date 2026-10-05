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
> Emit log records as objects with named fields instead of interpolating values into a sentence.

## Why

A formatted string cannot be filtered or aggregated by field, and the value boundaries blur. Structured records keep each attribute addressable by the logging system, which is the event-data shape the OWASP logging guidance describes.

## Bad

```typescript
export function logRequest(method: string, path: string): void {
  console.log(`${method} ${path}`);
}
```

## Good

```typescript
export function logRequest(method: string, path: string): void {
  console.log(JSON.stringify({ event: "request", method, path }));
}
```

## See Also

- [typescript-obs-interaction-id](obs-interaction-id.md) - the field that correlates records
- [typescript-obs-log-error-object](obs-log-error-object.md) - logging the error itself as a field

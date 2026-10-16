---
id: typescript-obs-log-error-object
lang: typescript
prefix: obs
title: Log allowlisted error diagnostics, not raw Error objects
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Error, stack trace, logging]
  files: ["**/*.ts", "**/*.tsx"]
related: [shared-obs-allowlisted-diagnostics, typescript-err-wrap-with-cause, typescript-obs-structured-log]
sources:
  - title: OWASP Logging Cheat Sheet - Data to exclude
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
  - title: "MDN - Error: cause"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
---
> Emit a static event and reviewed error code; never serialize raw errors, messages, stacks or causes by default.

## Why

Errors can embed credentials, URLs, customer data and subprocess output. Passing the whole object to a logger exposes more than its message. Preserve useful diagnostics through allowlisted event identities and codes; use opaque correlation IDs for protected operational investigation. Redaction alone cannot recognize arbitrary secrets or personal data.

## Bad

```typescript
export function report(error: Error): void {
  console.error(error);
}
```

## Good

```typescript
export function report(error: Error): void {
  const category = error instanceof TypeError ? "TYPE_ERROR" : "OPERATION_FAILED";
  console.error(JSON.stringify({ event: "operation.failed", category }));
}
```

## See Also

- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - preserve causes internally without exporting them to logs
- [typescript-obs-structured-log](obs-structured-log.md) - recording the error as a field

---
id: typescript-sec-error-response-generic
lang: typescript
prefix: sec
title: Return a generic error body to clients
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error response, stack trace, information disclosure]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error]
related: [typescript-err-log-once, typescript-sec-no-secrets-in-url]
sources:
  - title: OWASP - Error Handling Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
---
> Return a generic error body to clients and keep stack traces in server logs.

## Why

Stack traces and driver messages disclose framework versions, file paths, and query shapes that an attacker uses to map the system during reconnaissance. The client needs a status and a safe message; the diagnostic detail belongs in server-side logs where access is controlled.

## Bad

```typescript
function errorResponse(error: Error): { status: number; body: string } {
  return { status: 500, body: error.stack ?? error.message };
}
```

## Good

```typescript
function errorResponse(): { status: number; body: string } {
  return { status: 500, body: "internal server error" };
}
```

## See Also

- [typescript-err-log-once](err-log-once.md) - where the detail is recorded instead
- [typescript-sec-no-secrets-in-url](sec-no-secrets-in-url.md) - the same disclosure concern for request data

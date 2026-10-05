---
id: typescript-obs-interaction-id
lang: typescript
prefix: obs
title: Tag related log entries with an interaction identifier
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [correlation id, request id, logging]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-obs-structured-log, typescript-err-log-once]
sources:
  - title: OWASP Cheat Sheet Series - Logging (event attributes)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Carry one identifier through every log entry for a request so its events can be correlated.

## Why

Entries from one request interleave with entries from every other request. The OWASP logging guidance lists an interaction identifier among the event attributes that make records correlatable; passing the id through the call chain keeps the trail joinable.

## Bad

```typescript
export function logFailure(message: string): void {
  console.error(JSON.stringify({ event: "failure", message }));
}
```

## Good

```typescript
export function logFailure(interactionId: string, message: string): void {
  console.error(JSON.stringify({ event: "failure", interactionId, message }));
}
```

## See Also

- [typescript-obs-structured-log](obs-structured-log.md) - the record shape this field extends
- [typescript-err-log-once](err-log-once.md) - logging the failure once, where it is handled

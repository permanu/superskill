---
id: typescript-obs-no-pii
lang: typescript
prefix: obs
title: Keep secrets and personal data out of logs
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sensitive data, logs, credentials]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-obs-structured-log, typescript-sec-secrets-from-env]
sources:
  - title: OWASP Cheat Sheet Series - Logging (data to exclude)
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---
> Log identifiers and outcomes, never credentials or personal data, which logs retain and ship widely.

## Why

Logs are copied, forwarded, and retained far beyond the request that wrote them, so a secret or personal value written once is exposed everywhere the logs go. The OWASP logging guidance lists sensitive data as a category to exclude.

## Bad

```typescript
export function logLogin(user: { name: string; password: string }): void {
  console.log(`login ${user.name} ${user.password}`);
}
```

## Good

```typescript
export function logLogin(user: { name: string }): void {
  console.log(`login ${user.name}`);
}
```

## See Also

- [typescript-obs-structured-log](obs-structured-log.md) - the record shape that makes field-level exclusion possible
- [typescript-sec-secrets-from-env](sec-secrets-from-env.md) - where the credentials belong instead

---
id: typescript-obs-log-error-object
lang: typescript
prefix: obs
title: Log the Error object, not its message
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Error, stack trace, logging]
  files: ["**/*.ts", "**/*.tsx"]
related: [typescript-err-wrap-with-cause, typescript-obs-structured-log]
sources:
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
  - title: "MDN - Error: cause"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
---
> Pass the Error to the logger so the stack and cause chain survive into the record.

## Why

The message alone drops the stack and the cause, which are what make a production failure diagnosable. The Error object carries both, and the logger renders it at the sink where the format belongs.

## Bad

```typescript
export function report(error: Error): void {
  console.error(error.message);
}
```

## Good

```typescript
export function report(error: Error): void {
  console.error(error);
}
```

## See Also

- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - the cause chain the Error carries
- [typescript-obs-structured-log](obs-structured-log.md) - recording the error as a field

---
id: typescript-err-error-code
lang: typescript
prefix: err
title: Identify failures by class and stable code, never by message text
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error code, message, instanceof, matching]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error]
related: [typescript-err-domain-error-class, typescript-err-catch-unknown]
sources:
  - title: Node.js - Errors (error.code)
    url: https://nodejs.org/api/errors.html
  - title: MDN - Error
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
---
> Branch on error class and a stable `code` field; never match on message text.

## Why

Messages are human-facing prose and change without notice, so message matching breaks silently when wording changes. Classes and `code` fields are the machine-readable contract that Node.js uses for system errors and that callers can rely on.

## Bad

```typescript
declare function callApi(): Promise<void>;
declare function pause(): Promise<void>;

async function run(): Promise<void> {
  try {
    await callApi();
  } catch (e) {
    if (e instanceof Error && e.message.includes("rate limit")) {
      await pause();
      return;
    }
    throw e;
  }
}
```

## Good

```typescript
declare function callApi(): Promise<void>;
declare function pause(): Promise<void>;

async function run(): Promise<void> {
  try {
    await callApi();
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "RATE_LIMITED") {
      await pause();
      return;
    }
    throw e;
  }
}
```

## See Also

- [typescript-err-domain-error-class](err-domain-error-class.md) - defining the class and code this rule consumes
- [typescript-err-catch-unknown](err-catch-unknown.md) - narrowing the caught value before inspecting it

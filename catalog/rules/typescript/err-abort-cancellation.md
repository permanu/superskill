---
id: typescript-err-abort-cancellation
lang: typescript
prefix: err
title: "Treat abort as cancellation, not failure: stop work and keep it out of error logs"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [abort, cancellation, signal, AbortError]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AbortSignal, AbortController]
related: [typescript-err-retry-idempotent, typescript-err-async-propagate]
sources:
  - title: MDN - AbortSignal
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
  - title: MDN - Using promises (cancellation)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
---
> Treat an aborted operation as cancelled work: return or propagate the abort, never log it as a failure.

## Why

Cancellation is a normal outcome of a caller or timeout deciding the result is no longer needed. Reporting it through error logs and retry loops turns expected control flow into noise and re-runs work the caller already abandoned.

## Bad

```typescript
declare function fetchReport(signal: AbortSignal): Promise<string>;

async function loadReport(signal: AbortSignal): Promise<string> {
  try {
    return await fetchReport(signal);
  } catch (e) {
    console.error("report failed", e);
    throw e;
  }
}
```

## Good

```typescript
declare function fetchReport(signal: AbortSignal): Promise<string>;

async function loadReport(signal: AbortSignal): Promise<string | undefined> {
  try {
    return await fetchReport(signal);
  } catch (e) {
    if (signal.aborted) {
      return undefined;
    }
    throw e;
  }
}
```

## See Also

- [typescript-err-retry-idempotent](err-retry-idempotent.md) - retries must stop when the signal is aborted
- [typescript-err-async-propagate](err-async-propagate.md) - keeping the rejection attached to a handler

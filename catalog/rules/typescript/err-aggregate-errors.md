---
id: typescript-err-aggregate-errors
lang: typescript
prefix: err
title: Report parallel failures together with AggregateError instead of first-error-only
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [AggregateError, allSettled, parallel, batch]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [AggregateError, Promise.allSettled]
related: [typescript-err-result-union, typescript-err-retry-idempotent]
sources:
  - title: MDN - AggregateError
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
  - title: MDN - Promise (concurrency)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
---
> Collect parallel failures and throw one `AggregateError`; do not report only the first rejection.

## Why

`Promise.all` rejects with the first failure and discards the rest, so a batch caller fixes one item per run. `Promise.allSettled` observes every outcome, and `AggregateError` reports all failing sites in one error with an `errors` array.

## Bad

```typescript
declare function validateRow(row: string): Promise<void>;

async function validateAll(rows: string[]): Promise<void> {
  await Promise.all(rows.map((row) => validateRow(row)));
}
```

## Good

```typescript
declare function validateRow(row: string): Promise<void>;

async function validateAll(rows: string[]): Promise<void> {
  const results = await Promise.allSettled(rows.map((row) => validateRow(row)));
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);
  if (errors.length > 0) {
    throw new AggregateError(errors, `${errors.length} rows failed validation`);
  }
}
```

## See Also

- [typescript-err-result-union](err-result-union.md) - representing per-item outcomes as values instead of a throw
- [typescript-err-retry-idempotent](err-retry-idempotent.md) - retrying only the failed items safely

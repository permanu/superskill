---
id: typescript-err-retry-idempotent
lang: typescript
prefix: err
title: Retry only idempotent operations, with a bounded attempt count and delay
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [retry, idempotent, backoff, transient]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Promise]
related: [typescript-err-abort-cancellation, typescript-err-error-code]
sources:
  - title: RFC 9110 - HTTP Semantics, Idempotent Methods
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods
  - title: RFC 9110 - HTTP Semantics, Retry-After
    url: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
---
> Retry only operations that are safe to repeat, with a bounded attempt count and a delay between attempts.

## Why

Repeating a non-idempotent operation can duplicate its effect, while retrying without a bound can hammer a failing dependency and delay failure indefinitely. HTTP defines which methods may be repeated automatically, and callers must apply the same discipline to any operation they retry.

## Bad

```typescript
declare function postOrder(order: { id: string }): Promise<void>;

async function submit(order: { id: string }): Promise<void> {
  let done = false;
  while (!done) {
    try {
      await postOrder(order);
      done = true;
    } catch {
      // try again immediately
    }
  }
}
```

## Good

```typescript
declare function putOrder(order: { id: string }): Promise<void>;
declare function delay(ms: number): Promise<void>;

async function submit(order: { id: string }): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await putOrder(order);
      return;
    } catch (e) {
      if (attempt === 3) {
        throw e;
      }
      await delay(100 * 2 ** attempt);
    }
  }
}
```

## See Also

- [typescript-err-abort-cancellation](err-abort-cancellation.md) - stopping the retry loop when the caller cancels
- [typescript-err-error-code](err-error-code.md) - deciding from a stable code whether a failure is retryable

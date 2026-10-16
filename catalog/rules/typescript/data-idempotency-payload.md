---
id: typescript-data-idempotency-payload
lang: typescript
prefix: data
title: Reject idempotency key reuse with a different request
severity: must
enforce: review
baseline: latest
status: verified
related: [shared-data-idempotency-payload, typescript-err-retry-idempotent]
triggers:
  keywords: [idempotency key, payment retry, duplicate payment, replay request]
  files: ["**/*idempotency*.ts"]
sources:
  - title: Stripe API - Idempotent requests
    url: https://docs.stripe.com/api/idempotent_requests
---
> Compare the normalized operation parameters before replaying a result for an existing idempotency key.

## Why

Reusing a key for a different amount or recipient must not replay the old operation's result as success for the new request. Stripe documents rejecting changed parameters for an existing key; compare all semantically relevant fields using a defined normalized representation. The example validates a saved request match only: tenant-scoped lookup, durable atomic key reservation, concurrent execution, retention and business-effect commit still need storage-level enforcement and integration tests.

## Bad

```typescript
interface Request { tenant: string; operation: string; recipient: string; currency: string; minor: bigint }
export function classifyRetry(saved: Request, incoming: Request): "replay" | "conflict" {
  return "replay";
}
```

## Good

```typescript
interface Request { tenant: string; operation: string; recipient: string; currency: string; minor: bigint }
export function classifyRetry(saved: Request, incoming: Request): "replay" | "conflict" {
  const same = saved.tenant === incoming.tenant && saved.operation === incoming.operation
    && saved.recipient === incoming.recipient && saved.currency === incoming.currency
    && saved.minor === incoming.minor;
  return same ? "replay" : "conflict";
}
```

## See Also

- [shared-data-idempotency-payload](../shared/data-idempotency-payload.md) - language-independent request binding invariant
- [typescript-err-retry-idempotent](err-retry-idempotent.md) - retries need idempotent business effects

---
id: shared-data-idempotency-payload
lang: shared
prefix: data
title: Bind idempotency keys to the original operation parameters
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [idempotency key, payment retry, duplicate payment, replay request]
sources:
  - title: Stripe API - Idempotent requests
    url: https://docs.stripe.com/api/idempotent_requests
---
> Reject replay of a retained idempotency record when any normalized effect-relevant parameter differs from the original request.

## Why

A reused key must not make a different operation appear successful by replaying an unrelated result. Scope the lookup to the authorized tenant and operation, and compare a defined normalized representation of all effect-relevant parameters. The same textual key in an independent namespace is not a retry of this record; after documented expiry, a key can represent a new operation. This comparison does not establish exactly-once processing: durable atomic reservation, concurrent execution, expiry and result/effect commit need additional storage-level guarantees.

## Bad

```text
Saved key K requested 100 USD minor units for recipient A.
Retry K requests 200 USD minor units for recipient B.
Return the saved success without comparing parameters.
```

## Good

```text
Authorize and scope K; compare the normalized operation and parameters.
For retained K, changing 100 to 200 minor units, USD to EUR or A to B rejects replay.
A record belonging to a different tenant or operation cannot supply the result.
Identical retry: follow the documented stored-result/in-progress contract.
Test every parameter independently and concurrent retries at the storage boundary.
```

## See Also

- [shared-sec-project-scope](sec-project-scope.md) - authorize and isolate the idempotency namespace

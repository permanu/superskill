---
id: shared-data-balanced-postings
lang: shared
prefix: data
title: Balance debit and credit postings within each currency
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ledger postings, double entry, ledger transaction, balance debits credits]
sources:
  - title: Modern Treasury Ledgers - Use multiple currencies
    url: https://docs.moderntreasury.com/ledgers/docs/use-multiple-currencies
---
> Require exact debit-credit balance separately for each currency before committing a ledger transaction.

## Why

A debit in one currency cannot cancel a credit in another. Use validated exact amounts and consistent currency exponents, check the entire transaction by currency, and commit its entries atomically. Trusted account metadata, authorization, reversals and reconciliation remain distinct invariants; balanced entries alone do not prove a valid payment.

## Bad

```text
Debit 100 USD minor units and credit 100 EUR minor units.
Sum the signed numbers to zero and accept the transaction.
```

## Good

```text
Group validated postings by currency and consistent exponent.
Each currency must independently have equal debit and credit totals.
Reject the USD/EUR mismatch; persist a valid complete batch atomically.
Debit 100 USD, credit 60 USD and credit 40 USD: balanced; credit 39 instead: reject.
Test cross-currency cancellation, split postings and large exact amounts.
```

## See Also

- [shared-data-idempotency-payload](data-idempotency-payload.md) - distinguish balanced entries from retry safety

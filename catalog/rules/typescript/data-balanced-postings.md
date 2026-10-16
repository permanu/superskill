---
id: typescript-data-balanced-postings
lang: typescript
prefix: data
title: Balance ledger postings separately for each currency
severity: must
enforce: review
baseline: latest
status: verified
related: [shared-data-balanced-postings, typescript-num-money-minor-units]
triggers:
  keywords: [ledger postings, double entry, ledger transaction, balance debits credits]
  files: ["**/ledger/**/*.ts", "**/*ledger*.ts"]
sources:
  - title: Modern Treasury Ledgers - Use multiple currencies
    url: https://docs.moderntreasury.com/ledgers/docs/use-multiple-currencies
---
> Reject a ledger transaction unless debit and credit amounts balance separately within every currency.

## Why

Summing different currencies can hide an unbalanced transaction, such as a USD debit offset by a EUR credit. Modern Treasury's ledger contract requires debits to equal credits in each currency; use exact minor units with a consistent exponent for each currency and validate the full batch. This function covers the balance invariant for validated entries only; trusted account currencies, authorization, and atomic posting of the complete batch remain persistence-boundary obligations.

## Bad

```typescript
interface Entry { currency: string; direction: "debit" | "credit"; minor: bigint }
export function assertBalanced(entries: readonly Entry[]): void {
  const total = entries.reduce((sum, entry) => sum + (entry.direction === "debit" ? entry.minor : -entry.minor), 0n);
  if (total !== 0n) throw new Error("UNBALANCED_TRANSACTION");
}
```

## Good

```typescript
interface Entry { currency: string; direction: "debit" | "credit"; minor: bigint }
export function assertBalanced(entries: readonly Entry[]): void {
  if (entries.length < 2) throw new Error("POSTINGS_REQUIRED");
  const totals = new Map<string, bigint>();
  for (const entry of entries) {
    if (!entry.currency || entry.minor <= 0n) throw new Error("INVALID_POSTING");
    const signed = entry.direction === "debit" ? entry.minor : -entry.minor;
    totals.set(entry.currency, (totals.get(entry.currency) ?? 0n) + signed);
  }
  if ([...totals.values()].some(total => total !== 0n)) throw new Error("UNBALANCED_TRANSACTION");
}
```

## See Also

- [shared-data-balanced-postings](../shared/data-balanced-postings.md) - language-independent ledger invariant
- [typescript-num-money-minor-units](num-money-minor-units.md) - preserve exact monetary representation

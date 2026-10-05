---
id: typescript-err-domain-error-class
lang: typescript
prefix: err
title: Model domain failures as named Error subclasses with stable fields
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error class, domain error, instanceof, name]
  files: ["**/*.ts", "**/*.tsx"]
  symbols: [Error, instanceof]
related: [typescript-err-throw-error-only, typescript-err-error-code, typescript-err-wrap-with-cause]
sources:
  - title: MDN - Error (custom error types)
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
  - title: Node.js - Errors
    url: https://nodejs.org/api/errors.html
---
> Represent each recoverable domain failure as an `Error` subclass with a stable name and typed fields.

## Why

A generic `new Error("insufficient funds")` can only be identified by parsing its message, and it carries no typed payload. A named subclass gives handlers an `instanceof` check, logs a stable `name`, and carries the data the caller needs to react.

## Bad

```typescript
function withdraw(balance: number, amount: number): number {
  if (amount > balance) {
    throw new Error("insufficient funds");
  }
  return balance - amount;
}
```

## Good

```typescript
class InsufficientFundsError extends Error {
  readonly code = "INSUFFICIENT_FUNDS";

  constructor(readonly balance: number, readonly amount: number) {
    super(`cannot withdraw ${amount} from balance ${balance}`);
    this.name = "InsufficientFundsError";
  }
}

function withdraw(balance: number, amount: number): number {
  if (amount > balance) {
    throw new InsufficientFundsError(balance, amount);
  }
  return balance - amount;
}
```

## See Also

- [typescript-err-throw-error-only](err-throw-error-only.md) - the base contract these subclasses extend
- [typescript-err-error-code](err-error-code.md) - consuming the class and its code at the call site
- [typescript-err-wrap-with-cause](err-wrap-with-cause.md) - attaching the underlying failure when the domain error wraps one

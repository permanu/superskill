---
id: java-err-custom-type
lang: java
prefix: err
title: "Give each distinct failure its own exception type so callers can react to it"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, hierarchy, domain, custom, type]
  files: ["**/*.java"]
  symbols: [RuntimeException, Exception]
related: [java-err-checked-vs-unchecked, java-err-wrap-cause]
sources:
  - title: "Java Tutorials: Creating Exception Classes"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/creating.html
  - title: "Throwable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Throwable.html
---
> Define an exception type for every failure callers must distinguish, named after the failure.

## Why

The tutorial's checklist for a custom exception class includes a failure the platform does not represent and one that users must tell apart from other vendors' exceptions. IllegalStateException("insufficient funds") is indistinguishable at the catch site from a framework bug, so callers cannot write a targeted recovery. Throwable's contract expects instances to be freshly created in the exceptional situation so they carry the relevant information.

## Bad

```java
import java.math.BigDecimal;

class Wallet {
    void withdraw(BigDecimal amount) {
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("negative amount");
        }
        if (balance().compareTo(amount) < 0) {
            throw new IllegalStateException("insufficient funds");
        }
    }

    private BigDecimal balance() {
        return BigDecimal.TEN;
    }
}
```

## Good

```java
import java.math.BigDecimal;

class Wallet {
    void withdraw(BigDecimal amount) {
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("negative amount");
        }
        if (balance().compareTo(amount) < 0) {
            throw new InsufficientFundsException(amount, balance());
        }
    }

    private BigDecimal balance() {
        return BigDecimal.TEN;
    }
}

class InsufficientFundsException extends RuntimeException {
    InsufficientFundsException(BigDecimal requested, BigDecimal available) {
        super("insufficient funds: requested " + requested + ", available " + available);
    }
}
```

## See Also

- [java-err-checked-vs-unchecked](err-checked-vs-unchecked.md) - choosing the base class for the new type
- [java-err-wrap-cause](err-wrap-cause.md) - keeping the original failure when translating into the new type

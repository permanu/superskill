---
id: java-conc-lock-consistency
lang: java
prefix: conc
title: "Guard every access to shared mutable state with the same lock"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [synchronized, lock, monitor, data race]
  files: ["**/*.java"]
  symbols: [synchronized]
related: [java-conc-volatile-visibility, java-conc-atomic-counters]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Lock every read and write of a shared invariant on the same monitor; a partially locked field is a data race.

## Why

The java.util.concurrent package summary quotes the monitor rule: "An unlock (synchronized block or method exit) of a monitor happens-before every subsequent lock (synchronized block or method entry) of that same monitor." If one method locks and another writes without locking, no happens-before edge exists between them, and the reader can see stale data. Locking only the reads is the most common form of this mistake because the write path looks harmless.

## Bad

```java
class Account {
    private int balance;

    synchronized int balance() {
        return balance;
    }

    void deposit(int amount) {
        balance += amount;
    }
}
```

## Good

```java
class Account {
    private int balance;

    synchronized int balance() {
        return balance;
    }

    synchronized void deposit(int amount) {
        balance += amount;
    }
}
```

## See Also

- [java-conc-volatile-visibility](conc-volatile-visibility.md) - single-flag visibility without a lock
- [java-conc-atomic-counters](conc-atomic-counters.md) - single-variable atomicity without a lock

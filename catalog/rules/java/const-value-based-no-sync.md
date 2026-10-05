---
id: java-const-value-based-no-sync
lang: java
prefix: const
title: "Never synchronize on a value-based instance"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [value-based, synchronization, boxed, lock]
  files: ["**/*.java"]
  symbols: [Integer]
related: [java-type-value-based-identity]
sources:
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Boxed primitives are value-based; locking on them can deadlock unrelated code.

## Why

The Integer documentation warns: "This is a value-based class; programmers should treat instances that are equal as interchangeable and should not use instances for synchronization, or unpredictable behavior may occur. For example, in a future release, synchronization may fail." Boxed numbers are shared through caches, so two unrelated code paths that synchronize on the same small int contend on the same monitor; a dedicated lock object has exactly one owner.

## Bad

```java
class Counter {
    private final Integer lock = 0;
    private int value;

    int next() {
        synchronized (lock) {
            return ++value;
        }
    }
}
```

## Good

```java
class Counter {
    private final Object lock = new Object();
    private int value;

    int next() {
        synchronized (lock) {
            return ++value;
        }
    }
}
```

## See Also

- [java-type-value-based-identity](type-value-based-identity.md) - the equality side of the same warning

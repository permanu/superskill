---
id: java-conc-lock-finally
lang: java
prefix: conc
title: "Unlock in a finally block"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [lock, finally, unlock, reentrant]
  files: ["**/*.java"]
  symbols: [ReentrantLock]
related: [java-conc-lock-consistency]
sources:
  - title: "ReentrantLock API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html
---
> Pair every lock() with unlock() as the first statement of a finally block.

## Why

The ReentrantLock documentation states that "it is recommended practice to always immediately follow a call to lock with a try block, and to always immediately call unlock as the first statement in the finally block". Without the finally, any exception or early return between lock and unlock leaves the lock held forever, and every other thread that needs it stalls until the process restarts.

## Bad

```java
import java.util.concurrent.locks.ReentrantLock;

class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    private int value;

    int increment() {
        lock.lock();
        int next = ++value;
        lock.unlock();
        return next;
    }
}
```

## Good

```java
import java.util.concurrent.locks.ReentrantLock;

class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    private int value;

    int increment() {
        lock.lock();
        try {
            return ++value;
        } finally {
            lock.unlock();
        }
    }
}
```

## See Also

- [java-conc-lock-consistency](conc-lock-consistency.md) - guarding state with one lock

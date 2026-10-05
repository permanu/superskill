---
id: java-conc-no-thread-stop
lang: java
prefix: conc
title: "Interrupt a thread to stop it; never call Thread.stop"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stop, interrupt, cancellation, thread]
  files: ["**/*.java"]
  symbols: [Thread.stop, Thread.interrupt]
related: [java-err-interrupt-restore]
sources:
  - title: "Thread API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.html
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Ask a thread to stop with interrupt(); never terminate it abruptly with stop().

## Why

Thread's stop() is deprecated for removal: it "was originally specified to 'stop' a victim thread by causing the victim thread to throw a ThreadDeath" at an arbitrary point, which can leave locks released and shared state inconsistent. JEP 444 records that stop(), suspend(), and resume() now throw UnsupportedOperationException for all threads, so the method is not a viable cancellation mechanism even where it still compiles. Interruption is cooperative: the target decides where to stop.

## Bad

```java
class Worker extends Thread {
    void shutdown() {
        stop();
    }
}
```

## Good

```java
class Worker extends Thread {
    void shutdown() {
        interrupt();
    }
}
```

## See Also

- [java-err-interrupt-restore](err-interrupt-restore.md) - handling the InterruptedException that interruption produces

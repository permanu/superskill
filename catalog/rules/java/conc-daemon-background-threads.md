---
id: java-conc-daemon-background-threads
lang: java
prefix: conc
title: "Mark background platform threads as daemon so they cannot block JVM exit"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [daemon, platform thread, shutdown, background]
  files: ["**/*.java"]
  symbols: [Thread.ofPlatform]
related: [java-conc-executor-close]
sources:
  - title: "Thread API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.html
---
> Create sidecar platform threads with Thread.ofPlatform().daemon() so shutdown is not held hostage.

## Why

The Thread API defines the shutdown rule: "The shutdown sequence begins when all started non-daemon threads have terminated." A background sidecar started as a non-daemon thread keeps the JVM alive after the application has finished its work, and a stuck sidecar turns a clean exit into a hang. Virtual threads are always daemon, so this decision only applies to platform threads you create.

## Bad

```java
class Sidecar {
    void start(Runnable task) {
        new Thread(task).start();
    }
}
```

## Good

```java
class Sidecar {
    void start(Runnable task) {
        Thread.ofPlatform().daemon().name("sidecar").start(task);
    }
}
```

## See Also

- [java-conc-executor-close](conc-executor-close.md) - the executor equivalent of owning a lifetime

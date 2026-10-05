---
id: java-err-no-catch-throwable
lang: java
prefix: err
title: "Do not catch Error or Throwable; handle the runtime failures your code can survive"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [catch, Throwable, Error, OutOfMemoryError]
  files: ["**/*.java"]
  symbols: [Throwable, Error]
related: [java-err-catch-specific]
sources:
  - title: "Error API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Error.html
  - title: "Throwable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Throwable.html
---
> Catch RuntimeException or a narrower type; let Error and Throwable failures reach the JVM.

## Why

Error marks serious problems that "a reasonable application should not try to catch": OutOfMemoryError, StackOverflowError, LinkageError. A handler that catches Throwable intercepts those failures, converts them into an ordinary return, and leaves the process in a degraded state with no signal that the JVM is failing. Runtime failures your code can survive are RuntimeException instances; everything above that is the platform's signal to shut down or isolate a thread.

## Bad

```java
class TaskRunner {
    void run(Runnable task) {
        try {
            task.run();
        } catch (Throwable t) {
            System.out.println("task failed: " + t);
        }
    }
}
```

## Good

```java
class TaskRunner {
    void run(Runnable task) {
        try {
            task.run();
        } catch (RuntimeException e) {
            System.out.println("task failed: " + e);
        }
    }
}
```

## See Also

- [java-err-catch-specific](err-catch-specific.md) - narrowing the handler to the failure it actually recovers from

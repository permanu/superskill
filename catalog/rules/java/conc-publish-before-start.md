---
id: java-conc-publish-before-start
lang: java
prefix: conc
title: "Publish state before starting the thread that reads it"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [start, publish, happens-before, initialization]
  files: ["**/*.java"]
  symbols: [Thread.start]
related: [java-conc-volatile-visibility, java-conc-lock-consistency]
sources:
  - title: "java.util.concurrent package summary"
    url: https://docs.oracle.com/javase/23/docs/api/java.base/java/util/concurrent/package-summary.html
---
> Assign shared fields before start(); the start call is the happens-before edge that publishes them.

## Why

The java.util.concurrent package summary guarantees that "A call to start on a thread happens-before any action in the started thread." That edge only covers writes that happened before start: assigning a field after start leaves the reader in a data race with no visibility guarantee, so the new thread can observe a stale value indefinitely. Initializing first and starting second turns the start edge into a safe publication.

## Bad

```java
class Job {
    private String input;
    private final Thread worker = new Thread(() -> System.out.println(input));

    void start(String input) {
        worker.start();
        this.input = input;
    }
}
```

## Good

```java
class Job {
    private String input;
    private final Thread worker = new Thread(() -> System.out.println(input));

    void start(String input) {
        this.input = input;
        worker.start();
    }
}
```

## See Also

- [java-conc-volatile-visibility](conc-volatile-visibility.md) - visibility for state that changes after start
- [java-conc-lock-consistency](conc-lock-consistency.md) - when several fields must be published together

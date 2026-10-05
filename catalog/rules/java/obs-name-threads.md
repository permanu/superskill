---
id: java-obs-name-threads
lang: java
prefix: obs
title: "Name the threads you start so dumps and logs identify the work"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [thread, naming, diagnostics, virtual-thread]
  files: ["**/*.java"]
  symbols: [Thread.ofVirtual, Thread.Builder]
related: [java-err-vt-uncaught-handler, java-obs-logger-not-stdout]
sources:
  - title: "Thread API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.html
---
> Give every thread a task-meaningful name; unnamed threads are anonymous in production evidence.

## Why

The Thread API says "threads have a unique identifier and a name... The thread name can be specified when creating a thread", and it also notes that "virtual threads do not have a thread name by default". Thread dumps, JFR events, and log records carry the thread name, so an unnamed thread appears as an empty label exactly when someone is trying to find which task is stuck or slow.

## Bad

```java
class Indexer {
    void start() {
        Thread.ofVirtual().start(() -> System.out.println("indexing"));
    }
}
```

## Good

```java
class Indexer {
    void start() {
        Thread.ofVirtual().name("indexer").start(() -> System.out.println("indexing"));
    }
}
```

## See Also

- [java-err-vt-uncaught-handler](err-vt-uncaught-handler.md) - the handler that reports these threads' failures
- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - the output channel those failures belong in

---
id: java-conc-executor-close
lang: java
prefix: conc
title: "Close every ExecutorService you create with try-with-resources"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [executor, close, shutdown, try-with-resources]
  files: ["**/*.java"]
  symbols: [ExecutorService, Executors]
related: [java-conc-vt-not-pooled, java-err-future-observed]
sources:
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
---
> Scope an executor to the work it serves and let try-with-resources close it and wait.

## Why

An ExecutorService owns threads and a task queue; abandoning the reference leaves that lifetime unmanaged. JEP 444's own example scopes the executor with try-with-resources and notes that "executor.close() is called implicitly, and waits", so the code cannot move past the block while tasks are still running. Dropping the executor instead means the caller never joins the tasks and nothing guarantees they finish before the process moves on.

## Bad

```java
import java.util.concurrent.Executors;

class Index {
    void build() {
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        executor.submit(() -> System.out.println("indexing"));
    }
}
```

## Good

```java
import java.util.concurrent.Executors;

class Index {
    void build() {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            executor.submit(() -> System.out.println("indexing"));
        }
    }
}
```

## See Also

- [java-conc-vt-not-pooled](conc-vt-not-pooled.md) - the executor this rule scopes
- [java-err-future-observed](err-future-observed.md) - observing the tasks close() waits for

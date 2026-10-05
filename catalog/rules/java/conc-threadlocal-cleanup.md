---
id: java-conc-threadlocal-cleanup
lang: java
prefix: conc
title: "Remove ThreadLocal values when the task that set them finishes"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [threadlocal, remove, cleanup, pooled]
  files: ["**/*.java"]
  symbols: [ThreadLocal.remove]
related: [java-conc-vt-no-threadlocal-cache]
sources:
  - title: "ThreadLocal API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ThreadLocal.html
---
> Call remove() in a finally block so a pooled thread does not carry state into the next task.

## Why

The ThreadLocal API states that "each thread holds an implicit reference to its copy of a thread-local variable as long as the thread is alive and the ThreadLocal instance is accessible". On a pooled platform thread the thread outlives the task, so an un-removed value stays attached to the thread and the next task on that thread inherits it; the same reference also keeps the value's object graph reachable. remove() ends the association deterministically.

## Bad

```java
class RequestHandler {
    private static final ThreadLocal<String> USER = new ThreadLocal<>();

    void handle(String user) {
        USER.set(user);
        System.out.println("handling " + USER.get());
    }
}
```

## Good

```java
class RequestHandler {
    private static final ThreadLocal<String> USER = new ThreadLocal<>();

    void handle(String user) {
        USER.set(user);
        try {
            System.out.println("handling " + USER.get());
        } finally {
            USER.remove();
        }
    }
}
```

## See Also

- [java-conc-vt-no-threadlocal-cache](conc-vt-no-threadlocal-cache.md) - when ThreadLocal is the wrong tool entirely

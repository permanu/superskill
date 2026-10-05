---
id: java-err-vt-uncaught-handler
lang: java
prefix: err
title: "Report uncaught exceptions from fire-and-forget threads through your logging pipeline"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [virtual thread, uncaught, handler, background, thread]
  files: ["**/*.java"]
  symbols: [Thread.ofVirtual, UncaughtExceptionHandler]
related: [java-err-future-observed]
sources:
  - title: "Thread.UncaughtExceptionHandler API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.UncaughtExceptionHandler.html
  - title: "JEP 444: Virtual Threads"
    url: https://openjdk.org/jeps/444
  - title: "ThreadGroup API: uncaughtException"
    url: "https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ThreadGroup.html#uncaughtException(java.lang.Thread,java.lang.Throwable)"
---
> Set an uncaught exception handler on threads started for side tasks; the default reaches only standard error.

## Why

When a thread terminates abruptly, the JVM queries its UncaughtExceptionHandler; with none set, the ThreadGroup default prints to standard error, which log aggregation and alerting never collect. Virtual threads are ordinary Thread instances with the same handler contract, so thread-per-task code that starts a task for its side effect has to route failures into the same pipeline as the rest of the service.

## Bad

```java
import java.util.concurrent.ThreadFactory;

class Listener {
    ThreadFactory backgroundTasks() {
        return Thread.ofVirtual().name("listener-", 0).factory();
    }
}
```

## Good

```java
import java.util.concurrent.ThreadFactory;
import java.util.logging.Level;
import java.util.logging.Logger;

class Listener {
    private static final Logger LOG = Logger.getLogger(Listener.class.getName());

    ThreadFactory backgroundTasks() {
        return Thread.ofVirtual()
                .name("listener-", 0)
                .uncaughtExceptionHandler(
                        (thread, failure) -> LOG.log(Level.SEVERE, "task failed on " + thread.getName(), failure))
                .factory();
    }
}
```

## See Also

- [java-err-future-observed](err-future-observed.md) - observed tasks report through their Future instead

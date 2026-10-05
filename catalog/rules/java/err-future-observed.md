---
id: java-err-future-observed
lang: java
prefix: err
title: "Retrieve every submitted task's Future so its exception cannot disappear"
severity: must
enforce: tool
tool: "errorprone:FutureReturnValueIgnored"
baseline: latest
status: verified
triggers:
  keywords: [Future, submit, executor, exception, await]
  files: ["**/*.java"]
  symbols: [Future, ExecutionException, Executors]
related: [java-err-vt-uncaught-handler, java-err-interrupt-restore]
sources:
  - title: "Future API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/concurrent/Future.html
  - title: "Error Prone: FutureReturnValueIgnored"
    url: https://errorprone.info/bugpattern/FutureReturnValueIgnored
---
> Keep and check the Future returned by submit; an ignored Future discards the task's exception.

## Why

Future.get() throws ExecutionException when the task failed, so the exception is only observable through the Future object. If submit's return value is dropped, the failure is stored in an unreachable object and the executor closes quietly: Error Prone's FutureReturnValueIgnored check exists because "ignoring returned Futures suppresses exceptions thrown from the code that completes the Future".

## Bad

```java
import java.util.concurrent.Executors;

class Mailer {
    void sendAll() {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 10; i++) {
                int id = i;
                executor.submit(() -> send("user-" + id));
            }
        }
    }

    private void send(String user) {
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

class Mailer {
    void sendAll() throws InterruptedException, ExecutionException {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> tasks = new ArrayList<>();
            for (int i = 0; i < 10; i++) {
                int id = i;
                tasks.add(executor.submit(() -> send("user-" + id)));
            }
            for (Future<?> task : tasks) {
                task.get();
            }
        }
    }

    private void send(String user) {
    }
}
```

## See Also

- [java-err-vt-uncaught-handler](err-vt-uncaught-handler.md) - the other failure channel for thread-per-task code
- [java-err-interrupt-restore](err-interrupt-restore.md) - joining tasks is interruptible

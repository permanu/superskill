---
id: java-err-interrupt-restore
lang: java
prefix: err
title: "Restore the interrupt flag when you cannot propagate InterruptedException"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interrupt, InterruptedException, cancellation, sleep]
  files: ["**/*.java"]
  symbols: [InterruptedException, Thread.interrupt]
related: [java-err-no-empty-catch, java-err-future-observed]
sources:
  - title: "Thread API: sleep"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Thread.html#sleep(long)
  - title: "Error Prone: InterruptedExceptionSwallowed"
    url: https://errorprone.info/bugpattern/InterruptedExceptionSwallowed
---
> On InterruptedException, either rethrow it or call Thread.currentThread().interrupt() before returning.

## Why

InterruptedException clears the thread's interrupted status, and that status is the only signal that a shutdown or timeout was requested. Swallowing the exception erases the signal, so callers that poll Thread.interrupted() keep running after cancellation. When a method cannot declare the checked exception, restoring the flag and returning promptly hands the decision back to the caller.

## Bad

```java
import java.time.Duration;

class QueuePoller {
    void pause() {
        try {
            Thread.sleep(Duration.ofMillis(10));
        } catch (InterruptedException e) {
            // cancellation is lost; callers keep waiting
        }
    }
}
```

## Good

```java
import java.time.Duration;

class QueuePoller {
    void pause() {
        try {
            Thread.sleep(Duration.ofMillis(10));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## See Also

- [java-err-no-empty-catch](err-no-empty-catch.md) - the general form of the mistake this rule specializes
- [java-err-future-observed](err-future-observed.md) - Future.get() is an interruption-sensitive call

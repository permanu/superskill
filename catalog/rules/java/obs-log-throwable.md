---
id: java-obs-log-throwable
lang: java
prefix: obs
title: "Pass exceptions to the log call; never embed them in the message"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, logging, throwable, stacktrace]
  files: ["**/*.java"]
  symbols: [Logger.log]
related: [java-obs-logger-not-stdout, java-err-wrap-cause]
sources:
  - title: "Logger API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.logging/java/util/logging/Logger.html
  - title: "Java Logging Overview"
    url: https://docs.oracle.com/en/java/javase/23/core/java-logging-overview.html
---
> Log the Throwable as an argument so handlers can render the stack trace and its cause chain.

## Why

The Logger API offers log(Level, String, Throwable) to log a message "with associated Throwable information", and handlers use that object to print the stack trace and the cause chain. String concatenation keeps only the message text: the frames, the suppressed exceptions, and the structured exception field are gone, and the Overview's own example passes the exception object — logger.log(Level.WARNING, "trouble sneezing", ex).

## Bad

```java
import java.util.logging.Level;
import java.util.logging.Logger;

class Sync {
    private static final Logger LOG = Logger.getLogger(Sync.class.getName());

    void push(String endpoint) {
        try {
            call(endpoint);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "push failed: " + e);
        }
    }

    private void call(String endpoint) {
    }
}
```

## Good

```java
import java.util.logging.Level;
import java.util.logging.Logger;

class Sync {
    private static final Logger LOG = Logger.getLogger(Sync.class.getName());

    void push(String endpoint) {
        try {
            call(endpoint);
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "push failed", e);
        }
    }

    private void call(String endpoint) {
    }
}
```

## See Also

- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - the logging call receiving the Throwable
- [java-err-wrap-cause](err-wrap-cause.md) - preserving the chain the handler prints

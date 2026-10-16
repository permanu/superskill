---
id: java-obs-log-throwable
lang: java
prefix: obs
title: "Log a bounded failure code instead of the Throwable"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, logging, throwable, stacktrace]
  files: ["**/*.java"]
  symbols: [Logger.log]
related: [shared-obs-allowlisted-diagnostics, java-obs-logger-not-stdout, java-err-wrap-cause]
sources:
  - title: "OWASP Logging Cheat Sheet"
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: "Logger API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.logging/java/util/logging/Logger.html
  - title: "Java Logging Overview"
    url: https://docs.oracle.com/en/java/javase/23/core/java-logging-overview.html
---
> Log an approved failure code and static event instead of passing arbitrary Throwables into logging handlers.

## Why

The Throwable overload preserves exception messages, causes and suppressed exceptions, all of which can contain sensitive request data. Use a reviewed bounded code and a static event at the logging boundary; preserve causes internally without exporting them by default. Verify the configured formatter and sink do not add rejected exception fields back into the record.

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
        java.net.URI.create(endpoint);
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
            String code = e instanceof IllegalArgumentException ? "INVALID_INPUT" : "PUSH_FAILED";
            LOG.log(Level.WARNING, "push.failed code={0}", code);
        }
    }

    private void call(String endpoint) {
        java.net.URI.create(endpoint);
    }
}
```

## See Also

- [shared-obs-allowlisted-diagnostics](../shared/obs-allowlisted-diagnostics.md) - the diagnostic field policy applied by this adapter
- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - routing approved events through logging handlers
- [java-err-wrap-cause](err-wrap-cause.md) - preserving causes internally without exporting them

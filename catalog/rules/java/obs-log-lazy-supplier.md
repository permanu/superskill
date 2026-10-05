---
id: java-obs-log-lazy-supplier
lang: java
prefix: obs
title: "Build log messages inside a Supplier so disabled levels cost nothing"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, supplier, lazy, performance]
  files: ["**/*.java"]
  symbols: [Logger.log, Supplier]
related: [java-obs-logger-not-stdout, java-obs-log-levels]
sources:
  - title: "Logger API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.logging/java/util/logging/Logger.html
---
> Pass a message supplier when constructing the message is more than a constant string.

## Why

The Logger API makes the tradeoff explicit with its own example: with the String-accepting method "the health status is collected unnecessarily even when the log level FINER is disabled", while with the Supplier-accepting version "the status will only be collected when the log level FINER is enabled". Tracing calls sit in hot paths and are usually disabled in production, so eagerly built strings pay serialization or computation costs for output that is thrown away.

## Bad

```java
import java.util.logging.Level;
import java.util.logging.Logger;

class Health {
    private static final Logger LOG = Logger.getLogger(Health.class.getName());

    void report() {
        LOG.log(Level.FINER, systemHealthStatus());
    }

    private static String systemHealthStatus() {
        return "cpu=12%";
    }
}
```

## Good

```java
import java.util.logging.Level;
import java.util.logging.Logger;

class Health {
    private static final Logger LOG = Logger.getLogger(Health.class.getName());

    void report() {
        LOG.log(Level.FINER, Health::systemHealthStatus);
    }

    private static String systemHealthStatus() {
        return "cpu=12%";
    }
}
```

## See Also

- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - the logging call this optimizes
- [java-obs-log-levels](obs-log-levels.md) - choosing the level that gates the supplier

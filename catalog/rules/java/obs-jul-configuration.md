---
id: java-obs-jul-configuration
lang: java
prefix: obs
title: "Leave level and handler choices to the logging configuration file"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [configuration, logging-properties, level, handlers]
  files: ["**/*.java"]
  symbols: [LogManager, Logger.setLevel]
related: [java-obs-log-levels, java-obs-logger-names]
sources:
  - title: "Java Logging Overview"
    url: https://docs.oracle.com/en/java/javase/23/core/java-logging-overview.html
---
> Log at the right level and let the configuration file decide what is emitted.

## Why

The Java Logging Overview explains that "the logging configuration can be initialized using a logging configuration file that will be read at startup" and that "the initial configuration may specify levels for particular loggers", with the default file at java-home/conf/logging.properties and the defaults "overridden by ISVs, system administrators, and end users". A setLevel call in application code overrides that operational control and cannot be changed without rebuilding and redeploying.

## Bad

```java
import java.util.logging.Level;
import java.util.logging.Logger;

class Bootstrap {
    void init() {
        Logger.getLogger("com.example").setLevel(Level.FINE);
    }
}
```

## Good

```java
import java.util.logging.Logger;

class Bootstrap {
    private static final Logger LOG = Logger.getLogger("com.example.payments");

    void charge() {
        LOG.fine("charging");
    }
}
```

## See Also

- [java-obs-log-levels](obs-log-levels.md) - the levels the configuration selects between
- [java-obs-logger-names](obs-logger-names.md) - the names the configuration targets

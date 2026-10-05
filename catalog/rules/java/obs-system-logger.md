---
id: java-obs-system-logger
lang: java
prefix: obs
title: "Libraries should log through System.Logger so the host routes messages"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [system-logger, library, routing, backend]
  files: ["**/*.java"]
  symbols: [System.getLogger, LoggerFinder]
related: [java-obs-logger-not-stdout, java-obs-logger-names]
sources:
  - title: "System.Logger API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/System.Logger.html
---
> Use the platform logging facade in shared libraries; applications keep their chosen framework.

## Why

The System.Logger API states that "System.Logger instances log messages that will be routed to the underlying logging framework the LoggerFinder uses". A library that calls java.util.logging directly pins every host application to that backend and its configuration; System.Logger hands the messages to whatever framework the application installed, or to the platform default when none is present.

## Bad

```java
import java.util.logging.Logger;

class Library {
    private static final Logger LOG = Logger.getLogger(Library.class.getName());

    void work() {
        LOG.info("working");
    }
}
```

## Good

```java
import java.lang.System.Logger;
import java.lang.System.Logger.Level;

class Library {
    private static final Logger LOG = System.getLogger(Library.class.getName());

    void work() {
        LOG.log(Level.INFO, "working");
    }
}
```

## See Also

- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - why printing directly is worse still
- [java-obs-logger-names](obs-logger-names.md) - the name handed to the host framework

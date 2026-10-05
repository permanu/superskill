---
id: java-obs-logger-not-stdout
lang: java
prefix: obs
title: "Log through a Logger, not System.out or System.err"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, stdout, logger, output]
  files: ["**/*.java"]
  symbols: [Logger, System.out]
related: [java-obs-logger-names, java-obs-log-lazy-supplier]
sources:
  - title: "Java Logging Overview"
    url: https://docs.oracle.com/en/java/javase/23/core/java-logging-overview.html
---
> Route diagnostics through the logging framework so levels, handlers, and configuration apply.

## Why

The Java Logging Overview describes the control flow: "Applications make logging calls on Logger objects", which allocate records "passed to Handler objects for publication", with levels and filters deciding what is published and a configuration file controlling the defaults. A direct println bypasses all of it: the line cannot be filtered by level, routed to a file or aggregator, or silenced in production, and it carries no timestamp or thread context.

## Bad

```java
class Importer {
    void run(String file) {
        System.out.println("importing " + file);
        System.err.println("done");
    }
}
```

## Good

```java
import java.util.logging.Logger;

class Importer {
    private static final Logger LOG = Logger.getLogger(Importer.class.getName());

    void run(String file) {
        LOG.info("importing " + file);
        LOG.fine("done");
    }
}
```

## See Also

- [java-obs-logger-names](obs-logger-names.md) - naming the logger that receives these calls
- [java-obs-log-lazy-supplier](obs-log-lazy-supplier.md) - keeping disabled log calls cheap

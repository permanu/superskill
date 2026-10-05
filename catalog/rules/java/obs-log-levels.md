---
id: java-obs-log-levels
lang: java
prefix: obs
title: "Match the log level to the operational response it should trigger"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [level, severe, warning, fine]
  files: ["**/*.java"]
  symbols: [Level.SEVERE, Level.WARNING, Level.FINE]
related: [java-obs-log-throwable, java-obs-jul-configuration]
sources:
  - title: "Level API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.logging/java/util/logging/Level.html
---
> Reserve SEVERE and WARNING for outcomes an operator must act on; put progress at INFO or below.

## Why

The Level API defines what each constant means: SEVERE messages "should describe events that are of considerable importance and which will prevent normal program execution"; WARNING covers "potential problems"; INFO "should only be used for reasonably significant messages"; and FINE covers "minor (recoverable) failures". Levels are the filter operators tune, so routine progress logged at WARNING trains people to ignore warnings, and real failures logged at INFO never reach alerting.

## Bad

```java
import java.util.logging.Logger;

class Batch {
    private static final Logger LOG = Logger.getLogger(Batch.class.getName());

    void process(int items) {
        LOG.warning("processing " + items + " items");
    }
}
```

## Good

```java
import java.util.logging.Logger;

class Batch {
    private static final Logger LOG = Logger.getLogger(Batch.class.getName());

    void process(int items) {
        LOG.fine("processing " + items + " items");
    }
}
```

## See Also

- [java-obs-log-throwable](obs-log-throwable.md) - attaching the failure evidence at the chosen level
- [java-obs-jul-configuration](obs-jul-configuration.md) - letting operations adjust the threshold

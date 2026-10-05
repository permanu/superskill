---
id: java-obs-logger-names
lang: java
prefix: obs
title: "Name loggers after the class or package, not a generic application name"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logger, naming, hierarchy, configuration]
  files: ["**/*.java"]
  symbols: [Logger.getLogger]
related: [java-obs-logger-not-stdout, java-obs-jul-configuration]
sources:
  - title: "Logger API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.logging/java/util/logging/Logger.html
  - title: "Java Logging Overview"
    url: https://docs.oracle.com/en/java/javase/23/core/java-logging-overview.html
---
> Use the class name as the logger name so configuration can target subtrees.

## Why

The Logger API says names "should normally be based on the package name or class name of the logged component, such as java.net or javax.swing", and the Java Logging Overview adds that "the namespace is hierarchical" and "should typically be aligned with the Java packaging namespace". Configuration sets levels on named subtrees, so one generic logger named "app" can only be turned up or down as a whole, while com.example.payments can be debugged without flooding the rest of the system.

## Bad

```java
import java.util.logging.Logger;

class Billing {
    private static final Logger LOG = Logger.getLogger("app");
}
```

## Good

```java
import java.util.logging.Logger;

class Billing {
    private static final Logger LOG = Logger.getLogger(Billing.class.getName());
}
```

## See Also

- [java-obs-logger-not-stdout](obs-logger-not-stdout.md) - the logger this name identifies
- [java-obs-jul-configuration](obs-jul-configuration.md) - configuring these names externally

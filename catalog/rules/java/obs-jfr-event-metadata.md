---
id: java-obs-jfr-event-metadata
lang: java
prefix: obs
title: "Label JFR events and fields so tools render readable names"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jfr, label, metadata, annotations]
  files: ["**/*.java"]
  symbols: [jdk.jfr.Label]
related: [java-obs-jfr-custom-event]
sources:
  - title: "jdk.jfr.Label API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/jdk.jfr/jdk/jfr/Label.html
  - title: "jdk.jfr.Event API"
    url: https://docs.oracle.com/en/java/javase/26/docs/api/jdk.jfr/jdk/jfr/Event.html
---
> Annotate event classes and fields with @Label so JFR views show human names.

## Why

The Label API "sets a human-readable name for an element" and prescribes headline-style capitalization for it. The Event API adds that "tools can visualize data in a meaningful way when annotations are used (for example, Label, Description, and Timespan)". Without labels, JFR tooling falls back to identifiers such as the field name records and the derived event class name, which are harder to scan and cannot be renamed without breaking the event type.

## Bad

```java
import jdk.jfr.Event;

class ImportEvent extends Event {
    String file;
    int records;
}
```

## Good

```java
import jdk.jfr.Event;
import jdk.jfr.Label;

@Label("Import")
class ImportEvent extends Event {
    @Label("Source file")
    String file;

    @Label("Record count")
    int records;
}
```

## See Also

- [java-obs-jfr-custom-event](obs-jfr-custom-event.md) - the event being labelled

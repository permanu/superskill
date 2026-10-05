---
id: java-obs-jfr-custom-event
lang: java
prefix: obs
title: "Define custom JFR events for domain operations you need to diagnose"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jfr, event, flight-recorder, instrumentation]
  files: ["**/*.java"]
  symbols: [jdk.jfr.Event]
related: [java-obs-jfr-event-metadata, java-obs-jfr-should-commit]
sources:
  - title: "jdk.jfr.Event API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/jdk.jfr/jdk/jfr/Event.html
---
> Model domain facts as typed JFR events and commit them where the fact occurs.

## Why

The Event API is the "base class for events, to be subclassed in order to define events and their fields", and "after an event is allocated and its field members are populated, it can be written to the Flight Recorder system by using the commit() method". A custom event records the domain fact with typed fields — file name, record count, duration — so JFR tooling can filter and aggregate it, instead of leaving that information buried in log prose.

## Bad

```java
import java.util.logging.Logger;

class Importer {
    private static final Logger LOG = Logger.getLogger(Importer.class.getName());

    void run(String file, int records) {
        LOG.info("imported " + file + ": " + records + " records");
    }
}
```

## Good

```java
import jdk.jfr.Event;

class ImportEvent extends Event {
    String file;
    int records;
}

class Importer {
    void run(String file, int records) {
        ImportEvent event = new ImportEvent();
        event.file = file;
        event.records = records;
        event.commit();
    }
}
```

## See Also

- [java-obs-jfr-event-metadata](obs-jfr-event-metadata.md) - naming the event and its fields for tools
- [java-obs-jfr-should-commit](obs-jfr-should-commit.md) - keeping field population cheap when disabled

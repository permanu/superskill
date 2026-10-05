---
id: java-obs-jfr-should-commit
lang: java
prefix: obs
title: "Guard expensive event fields with shouldCommit()"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jfr, shouldcommit, overhead, fields]
  files: ["**/*.java"]
  symbols: [jdk.jfr.Event]
related: [java-obs-jfr-custom-event]
sources:
  - title: "jdk.jfr.Event API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/jdk.jfr/jdk/jfr/Event.html
---
> Ask whether the event would be recorded before computing costly field values.

## Why

The Event API warns that "gathering data to store in an event can be expensive", and offers shouldCommit() to "verify whether an event instance would actually be written to the system when the commit() method is invoked. If shouldCommit() returns false, then those operations can be avoided." Events are disabled by default unless a recording enables them, so unconditional field computation pays the cost for data nobody is collecting.

## Bad

```java
import jdk.jfr.Event;

class SnapshotEvent extends Event {
    String state;
}

class Diagnostics {
    void snapshot() {
        SnapshotEvent event = new SnapshotEvent();
        event.state = expensiveState();
        event.commit();
    }

    private static String expensiveState() {
        return "state";
    }
}
```

## Good

```java
import jdk.jfr.Event;

class SnapshotEvent extends Event {
    String state;
}

class Diagnostics {
    void snapshot() {
        SnapshotEvent event = new SnapshotEvent();
        if (event.shouldCommit()) {
            event.state = expensiveState();
        }
        event.commit();
    }

    private static String expensiveState() {
        return "state";
    }
}
```

## See Also

- [java-obs-jfr-custom-event](obs-jfr-custom-event.md) - the event whose fields are being guarded

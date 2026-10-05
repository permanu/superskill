---
id: java-obs-jfr-recording
lang: java
prefix: obs
title: "Start JFR recordings programmatically around the operations you need to inspect"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [jfr, recording, dump, diagnostics]
  files: ["**/*.java"]
  symbols: [jdk.jfr.Recording]
related: [java-obs-jfr-custom-event]
sources:
  - title: "jdk.jfr.Recording API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/jdk.jfr/jdk/jfr/Recording.html
---
> Scope recordings with try-with-resources: start, dump, close.

## Why

The Recording API "provides means to configure, start, stop and dump recording data to disk", and its own example wraps start/stop/dump in try-with-resources. A newly created recording "is in the RecordingState.NEW state" and records nothing until start() is invoked; close() "releases all data that is associated with this recording", so a recording that is never closed keeps its buffers and repository data around.

## Bad

```java
import jdk.jfr.Recording;

class Diagnostics {
    Recording start() {
        Recording recording = new Recording();
        recording.start();
        return recording;
    }
}
```

## Good

```java
import java.nio.file.Path;

import jdk.jfr.Recording;

class Diagnostics {
    void capture(Path target) throws Exception {
        try (Recording recording = new Recording()) {
            recording.start();
            Thread.sleep(10);
            recording.dump(target);
        }
    }
}
```

## See Also

- [java-obs-jfr-custom-event](obs-jfr-custom-event.md) - the events a recording can capture

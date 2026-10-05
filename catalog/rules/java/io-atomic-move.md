---
id: java-io-atomic-move
lang: java
prefix: io
title: "Publish files atomically with Files.move and ATOMIC_MOVE"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file, move, atomic, publish]
  files: ["**/*.java"]
  symbols: [Files.move, ATOMIC_MOVE]
related: [java-io-whole-file-text]
sources:
  - title: "Files API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Stage the new content, then rename it into place with ATOMIC_MOVE; never delete the live file first.

## Why

The Files documentation defines ATOMIC_MOVE as moving "the file as an atomic file system operation", and file systems that cannot perform it throw AtomicMoveNotSupportedException instead of silently degrading. Deleting the live file and then moving leaves a window where readers observe no file at all, and a crash between the two steps loses the previous version. An atomic rename means readers see either the old file or the new one.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class ConfigPublisher {

    void publish(Path staged, Path live) throws IOException {
        Files.deleteIfExists(live);
        Files.move(staged, live);
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

class ConfigPublisher {

    void publish(Path staged, Path live) throws IOException {
        Files.move(staged, live, StandardCopyOption.ATOMIC_MOVE);
    }
}
```

## See Also

- [java-io-whole-file-text](io-whole-file-text.md) - writing the staged content

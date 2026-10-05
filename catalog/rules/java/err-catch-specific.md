---
id: java-err-catch-specific
lang: java
prefix: err
title: "Catch the narrowest exception you can actually handle, never Exception as a shortcut"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [catch, handler, specific, broad]
  files: ["**/*.java"]
  symbols: [Exception, NoSuchFileException]
related: [java-err-no-catch-throwable, java-err-no-empty-catch]
sources:
  - title: "Java Tutorials: Advantages of Exceptions"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/advantages.html
  - title: "Java Tutorials: The catch Blocks"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/catch.html
---
> Catch the specific exception types the code can handle so unanticipated failures keep propagating.

## Why

A catch clause is a recovery contract: it names the conditions this code knows how to fix. Oracle's tutorial states that handlers want to be as specific as possible, because an overly general handler must accommodate every failure it swallows, including bugs it was never written for. Catching Exception converts a NullPointerException from the try body into an "I/O failure" at the boundary and destroys the diagnosis the caller needs.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class Cache {
    String read(Path file) {
        try {
            return Files.readString(file);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;

class Cache {
    String read(Path file) {
        try {
            return Files.readString(file);
        } catch (NoSuchFileException e) {
            return "";
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
```

## See Also

- [java-err-no-catch-throwable](err-no-catch-throwable.md) - the unrecoverable types that must never enter a catch clause
- [java-err-no-empty-catch](err-no-empty-catch.md) - what a specific handler must do once it matches

---
id: java-err-multicatch
lang: java
prefix: err
title: "Merge exception types that share one recovery path into a single multi-catch clause"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [multi-catch, duplicate, handler, collapse]
  files: ["**/*.java"]
  symbols: [NoSuchFileException, AccessDeniedException]
related: [java-err-catch-specific]
sources:
  - title: "Java Tutorials: The catch Blocks"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/catch.html
---
> Handle exceptions that need identical recovery in one multi-catch clause instead of duplicated blocks.

## Why

The tutorial introduces multi-catch to "reduce code duplication and lessen the temptation to catch an overly broad exception". Duplicated handler bodies drift apart on the next edit, and the copy-paste version invites widening one clause to Exception to avoid repeating it. A multi-catch clause shows the single recovery path once, and its parameter is implicitly final so the handler cannot rewrite the exception.

## Bad

```java
import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;

class Indexer {
    List<String> lines(Path path) throws IOException {
        try {
            return Files.readAllLines(path);
        } catch (NoSuchFileException e) {
            return List.of();
        } catch (AccessDeniedException e) {
            return List.of();
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.List;

class Indexer {
    List<String> lines(Path path) throws IOException {
        try {
            return Files.readAllLines(path);
        } catch (NoSuchFileException | AccessDeniedException e) {
            return List.of();
        }
    }
}
```

## See Also

- [java-err-catch-specific](err-catch-specific.md) - keeping the merged clause narrow enough to handle

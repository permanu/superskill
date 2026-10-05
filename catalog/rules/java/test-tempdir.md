---
id: java-test-tempdir
lang: java
prefix: test
title: "Use @TempDir for filesystem tests instead of fixed paths"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tempdir, files, cleanup, filesystem]
  files: ["**/*.java"]
  symbols: [TempDir]
related: [java-test-no-order-dependency]
sources:
  - title: "JUnit User Guide: Built-in Extensions"
    url: https://docs.junit.org/6.1.3/writing-tests/built-in-extensions.html
---
> Let @TempDir create and delete the test's working directory instead of hand-managing a fixed path.

## Why

The JUnit User Guide describes the TempDirectory extension as creating "a temporary directory for an individual test or all tests in a test class", registered by default, and cleaned up after the test. A hard-coded path such as /tmp/report.txt collides when tests run in parallel, leaks files on failure when the manual delete is skipped, and can fail on machines where that path is not writable.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportTest {
    @Test
    void writes() throws IOException {
        Path file = Path.of("/tmp/report.txt");
        Files.writeString(file, "data");
        assertTrue(Files.exists(file));
        Files.delete(file);
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportTest {
    @Test
    void writes(@TempDir Path dir) throws IOException {
        Path file = dir.resolve("report.txt");
        Files.writeString(file, "data");
        assertTrue(Files.exists(file));
    }
}
```

## See Also

- [java-test-no-order-dependency](test-no-order-dependency.md) - the general per-test isolation rule

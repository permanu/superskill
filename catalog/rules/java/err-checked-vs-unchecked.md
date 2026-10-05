---
id: java-err-checked-vs-unchecked
lang: java
prefix: err
title: "Match the exception kind to the failure: checked for recoverable conditions, unchecked for programming errors"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [exception, checked, unchecked, throws, recover]
  files: ["**/*.java"]
  symbols: [IOException, RuntimeException]
related: [java-err-fail-fast-args, java-err-custom-type]
sources:
  - title: "Java Tutorials: Unchecked Exceptions - The Controversy"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/runtime.html
  - title: "JLS 11.2: Compile-Time Checking of Exceptions"
    url: https://docs.oracle.com/javase/specs/jls/se23/html/jls-11.html#jls-11.2
---
> Throw a checked exception when callers can recover; throw an unchecked exception for programming errors.

## Why

Checked exceptions are part of the method's contract: the compiler forces callers to acknowledge conditions they can recover from, such as a missing file or a failed request. Unchecked exceptions represent programming problems that callers cannot act on. Reporting a recoverable condition as IllegalStateException erases that contract, and wrapping every IOException in a runtime exception leaves callers no reason to plan a recovery path.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class UserConfig {
    String load(Path path) {
        if (!Files.exists(path)) {
            throw new IllegalStateException("config missing: " + path);
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class UserConfig {
    String load(Path path) throws IOException {
        if (path == null) {
            throw new IllegalArgumentException("path must not be null");
        }
        return Files.readString(path);
    }
}
```

## See Also

- [java-err-fail-fast-args](err-fail-fast-args.md) - the unchecked side of the contract, applied to arguments
- [java-err-custom-type](err-custom-type.md) - choosing an exception type once the checked/unchecked decision is made

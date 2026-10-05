---
id: java-err-wrap-cause
lang: java
prefix: err
title: "Wrap a lower-level failure with its cause instead of replacing it"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wrap, cause, chained, rethrow, translate]
  files: ["**/*.java"]
  symbols: [initCause, getCause]
related: [java-err-custom-type, java-err-suppressed-cleanup]
sources:
  - title: "Throwable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Throwable.html
  - title: "Java Tutorials: Chained Exceptions"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/chained.html
---
> Pass the original exception as the cause when translating a failure to a higher-level abstraction.

## Why

Throwable documents wrapping as the way to keep layers independent: letting a lower layer's exception propagate "would tie the API of the upper layer to the details of its implementation", and the cause chain preserves the root failure for diagnosis. Constructing the new exception without the cause discards the stack and the reason, leaving a message where the evidence used to be.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class ReportStore {
    String load(Path path) {
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("cannot load report " + path);
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class ReportStore {
    String load(Path path) {
        try {
            return Files.readString(path);
        } catch (IOException e) {
            throw new IllegalStateException("cannot load report " + path, e);
        }
    }
}
```

## See Also

- [java-err-custom-type](err-custom-type.md) - the exception type to wrap into
- [java-err-suppressed-cleanup](err-suppressed-cleanup.md) - attaching sibling failures that are not the cause

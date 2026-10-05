---
id: java-err-try-with-resources
lang: java
prefix: err
title: "Acquire every AutoCloseable in try-with-resources, not in a hand-written finally"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [try-with-resources, close, resource, finally, leak]
  files: ["**/*.java"]
  symbols: [AutoCloseable, Closeable]
related: [java-err-finally-normally, java-err-suppressed-cleanup]
sources:
  - title: "Java Tutorials: The try-with-resources Statement"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html
  - title: "AutoCloseable API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/AutoCloseable.html
---
> Declare resources in try-with-resources so close() runs in reverse order and close failures are suppressed.

## Why

A hand-written finally closes the first resource only if the close call itself succeeds; Oracle's tutorial shows the leak that results when br.close() throws and fr.close() never runs. try-with-resources closes resources in reverse declaration order and attaches close failures as suppressed exceptions, so the operation's real failure survives. AutoCloseable's contract recommends try-with-resources for any instance that holds a releasable resource.

## Bad

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;

class Lines {
    String first(String text) throws IOException {
        BufferedReader reader = new BufferedReader(new StringReader(text));
        try {
            return reader.readLine();
        } finally {
            reader.close();
        }
    }
}
```

## Good

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;

class Lines {
    String first(String text) throws IOException {
        try (BufferedReader reader = new BufferedReader(new StringReader(text))) {
            return reader.readLine();
        }
    }
}
```

## See Also

- [java-err-finally-normally](err-finally-normally.md) - why a manual finally is the risky construction
- [java-err-suppressed-cleanup](err-suppressed-cleanup.md) - suppression semantics that try-with-resources applies for you

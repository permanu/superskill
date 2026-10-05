---
id: java-io-charset-explicit
lang: java
prefix: io
title: "Pass the charset explicitly when reading or writing text files"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [charset, utf8, encoding, file]
  files: ["**/*.java"]
  symbols: [StandardCharsets, FileWriter, FileReader]
related: [java-io-whole-file-text, java-io-malformed-report]
sources:
  - title: "JEP 400: UTF-8 by Default"
    url: https://openjdk.org/jeps/400
---
> Name the charset at every text file boundary instead of inheriting the JVM default.

## Why

JEP 400 made UTF-8 the default charset so that "APIs that depend upon the default charset will behave consistently across all implementations, operating systems, locales, and configurations", and it still recommends that application code "is changed to pass a charset argument to constructors". The default remains a JVM-wide setting that can be overridden at startup, so a constructor without a charset silently couples the file format to the runtime configuration. An explicit UTF-8 keeps the encoding part of the file's contract.

## Bad

```java
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

class ReportWriter {

    void write(File file, String report) throws IOException {
        try (FileWriter writer = new FileWriter(file)) {
            writer.write(report);
        }
    }
}
```

## Good

```java
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

class ReportWriter {

    void write(File file, String report) throws IOException {
        try (FileWriter writer = new FileWriter(file, StandardCharsets.UTF_8)) {
            writer.write(report);
        }
    }
}
```

## See Also

- [java-io-whole-file-text](io-whole-file-text.md) - the convenience methods that decode UTF-8 by default
- [java-io-malformed-report](io-malformed-report.md) - what happens to bytes that are not valid text

---
id: java-io-lines-stream
lang: java
prefix: io
title: "Stream large files line by line and close the returned stream"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file, lines, stream, large]
  files: ["**/*.java"]
  symbols: [Files.lines, readAllLines]
related: [java-io-whole-file-text, java-io-directory-stream-close]
sources:
  - title: "Files API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Process large files lazily with Files.lines, and close the stream that holds the file handle.

## Why

The Files documentation contrasts the streaming and eager reads: Files.lines "does not read all lines into a List, but instead populates lazily as the stream is consumed", so memory stays bounded regardless of file size. It also warns that "the returned stream contains a reference to an open file" and that "the file is closed by closing the stream". Read the stream inside try-with-resources or the handle leaks.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

class LogTail {

    long countErrors(Path log) throws IOException {
        List<String> lines = Files.readAllLines(log);
        return lines.stream().filter(line -> line.contains("ERROR")).count();
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class LogTail {

    long countErrors(Path log) throws IOException {
        try (var lines = Files.lines(log)) {
            return lines.filter(line -> line.contains("ERROR")).count();
        }
    }
}
```

## See Also

- [java-io-whole-file-text](io-whole-file-text.md) - the convenience methods for small files
- [java-io-directory-stream-close](io-directory-stream-close.md) - closing the other iterable file handle

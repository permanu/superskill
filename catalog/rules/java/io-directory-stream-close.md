---
id: java-io-directory-stream-close
lang: java
prefix: io
title: "Close DirectoryStream with try-with-resources"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [directory, stream, close, resource]
  files: ["**/*.java"]
  symbols: [DirectoryStream, Files.newDirectoryStream]
related: [java-err-try-with-resources, java-io-lines-stream]
sources:
  - title: "DirectoryStream API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/DirectoryStream.html
---
> Open directory listings inside try-with-resources; for-each over the handle does not close it.

## Why

The DirectoryStream documentation states that "a DirectoryStream is opened upon creation and is closed by invoking the close method" and that "closing a directory stream releases any resources associated with the stream". Because it is an Iterable rather than a java.util.stream.Stream, a for-each loop never closes it, and an abandoned handle holds operating-system resources until the stream is garbage collected. Declaring it as a try-with-resources resource makes the release deterministic.

## Bad

```java
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;

class Listing {

    int count(Path directory) throws IOException {
        DirectoryStream<Path> entries = Files.newDirectoryStream(directory);
        int count = 0;
        for (Path entry : entries) {
            count++;
        }
        return count;
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;

class Listing {

    int count(Path directory) throws IOException {
        int count = 0;
        try (DirectoryStream<Path> entries = Files.newDirectoryStream(directory)) {
            for (Path entry : entries) {
                count++;
            }
        }
        return count;
    }
}
```

## See Also

- [java-err-try-with-resources](err-try-with-resources.md) - the general resource rule
- [java-io-lines-stream](io-lines-stream.md) - the stream that must be closed after file reads

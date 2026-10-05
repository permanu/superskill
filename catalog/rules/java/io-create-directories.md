---
id: java-io-create-directories
lang: java
prefix: io
title: "Create parent directories with Files.createDirectories"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [directory, create, parents, idempotent]
  files: ["**/*.java"]
  symbols: [Files.createDirectories, Files.createDirectory]
related: [java-io-nio-over-file, java-io-path-resolve]
sources:
  - title: "Files API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Call createDirectories instead of checking then creating; it is idempotent and builds parents.

## Why

The Files documentation describes createDirectories as creating "all nonexistent parent directories first" and notes that, unlike createDirectory, "an exception is not thrown if the directory could not be created because it already exists". A Files.exists check followed by createDirectory races with other processes that create the same directory, and it still fails when intermediate directories are missing. The single call makes directory preparation safe to repeat.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class OutputDirs {

    void prepare(Path base, String run) throws IOException {
        Path directory = base.resolve(run);
        if (!Files.exists(directory)) {
            Files.createDirectory(directory);
        }
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class OutputDirs {

    void prepare(Path base, String run) throws IOException {
        Files.createDirectories(base.resolve(run));
    }
}
```

## See Also

- [java-io-nio-over-file](io-nio-over-file.md) - the API family this method belongs to
- [java-io-path-resolve](io-path-resolve.md) - building the directory path itself

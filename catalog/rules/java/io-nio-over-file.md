---
id: java-io-nio-over-file
lang: java
prefix: io
title: "Use java.nio.file Path and Files instead of java.io.File"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file, path, nio, filesystem]
  files: ["**/*.java"]
  symbols: [Path, Files, File]
related: [java-io-path-resolve, java-io-create-directories]
sources:
  - title: "File API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/io/File.html
---
> Reach for Path and Files; the File documentation itself points to java.nio.file for richer file access.

## Why

The java.io.File documentation states that "the java.nio.file package defines interfaces and classes for the Java virtual machine to access files, file attributes, and file systems" and that this API "may be used to overcome many of the limitations of the java.io.File class". File methods report failure as booleans that cannot distinguish a missing file from a denied one, and they offer no atomic move, attribute, or symbolic link operations. Path and Files expose those operations and throw exceptions that describe what went wrong.

## Bad

```java
import java.io.File;

class LogLocator {

    boolean hasRotated(File directory, String name) {
        File file = new File(directory, name + ".1");
        return file.exists();
    }
}
```

## Good

```java
import java.nio.file.Files;
import java.nio.file.Path;

class LogLocator {

    boolean hasRotated(Path directory, String name) {
        Path file = directory.resolve(name + ".1");
        return Files.exists(file);
    }
}
```

## See Also

- [java-io-path-resolve](io-path-resolve.md) - joining path components correctly
- [java-io-create-directories](io-create-directories.md) - creating directories idempotently

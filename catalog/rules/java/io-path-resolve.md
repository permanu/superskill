---
id: java-io-path-resolve
lang: java
prefix: io
title: "Build paths with Path.resolve, not string concatenation"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path, resolve, join, separator]
  files: ["**/*.java"]
  symbols: [Path.resolve, Path.of]
related: [java-io-nio-over-file, java-io-create-directories]
sources:
  - title: "Path API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Path.html
---
> Join path components with resolve so the file system's separator rules apply.

## Why

A Path "represents a path that is hierarchical and composed of a sequence of directory and file name elements separated by a special separator or delimiter"; the separator is platform-specific, so concatenating "/" hard-codes one platform's convention and produces malformed paths when a component already ends with a separator. Path.resolve "resolves the given path against this path", joining components with the file system's own rules and handling absolute arguments correctly.

## Bad

```java
import java.nio.file.Path;

class CachePath {

    Path resolve(Path directory, String key) {
        return Path.of(directory.toString() + "/" + key + ".cache");
    }
}
```

## Good

```java
import java.nio.file.Path;

class CachePath {

    Path resolve(Path directory, String key) {
        return directory.resolve(key + ".cache");
    }
}
```

## See Also

- [java-io-nio-over-file](io-nio-over-file.md) - moving off the legacy File API
- [java-io-create-directories](io-create-directories.md) - creating the resolved directories

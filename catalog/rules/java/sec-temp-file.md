---
id: java-sec-temp-file
lang: java
prefix: sec
title: "Create temporary files with Files.createTempFile, not predictable paths"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [temp-file, path, collision, symlink]
  files: ["**/*.java"]
  symbols: [Files.createTempFile]
related: [java-sec-deserialization-untrusted]
sources:
  - title: "Files API: createTempFile"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Let the JDK generate the name; a predictable temp path can be pre-created or read by others.

## Why

Files.createTempFile "creates an empty file in the default temporary-file directory, using the given prefix and suffix to generate its name", and the method guarantees that the returned file is empty and did not exist before. A path assembled from a fixed prefix and a user-controlled value can be pre-created by another process, collide between concurrent runs, or expose data to other users of the machine.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class Uploads {
    Path stage(String name, byte[] data) throws IOException {
        Path target = Path.of("/tmp/upload-" + name);
        Files.write(target, data);
        return target;
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class Uploads {
    Path stage(byte[] data) throws IOException {
        Path target = Files.createTempFile("upload-", ".tmp");
        Files.write(target, data);
        return target;
    }
}
```

## See Also

- [java-sec-deserialization-untrusted](sec-deserialization-untrusted.md) - treating external bytes as data, not as instructions

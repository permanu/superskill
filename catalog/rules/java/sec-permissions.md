---
id: java-sec-permissions
lang: java
prefix: sec
title: "Set restrictive permissions on files that hold secrets"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [permissions, posix, secrets, files]
  files: ["**/*.java"]
  symbols: [Files.createFile, PosixFilePermissions]
related: [java-sec-temp-file]
sources:
  - title: "Files API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Files.html
---
> Give credential files explicit owner-only permissions instead of inheriting defaults.

## Why

Files.createFile "creates a new and empty file, failing if the file already exists", and the file-attribute argument it accepts is documented as "file attributes to set atomically when creating the file". Creating the file with the owner-only mode already in place closes the window in which a write-then-chmod sequence leaves the secret readable under the process umask; setPosixFilePermissions alone changes the mode only after the file and its contents exist.

## Bad

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class TokenStore {
    void save(Path path, String token) throws IOException {
        Files.writeString(path, token);
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

class TokenStore {
    void save(Path path, String token) throws IOException {
        Files.createFile(path, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        Files.writeString(path, token);
    }
}
```

## See Also

- [java-sec-temp-file](sec-temp-file.md) - creating temporary files that hold data

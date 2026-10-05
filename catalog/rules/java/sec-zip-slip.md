---
id: java-sec-zip-slip
lang: java
prefix: sec
title: "Bound archive entry paths before extracting"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [zip, archive, entry, traversal]
  files: ["**/*.java"]
  symbols: [ZipEntry, ZipFile]
related: [java-sec-path-traversal]
sources:
  - title: "ZipEntry API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/zip/ZipEntry.html
  - title: "ZipFile API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/zip/ZipFile.html
---
> Treat entry names as untrusted paths: resolve, normalize, and check the base.

## Why

ZipFile "is used to read entries from a ZIP file", and each ZipEntry "is used to represent a ZIP file entry" whose name is just a string chosen by whoever built the archive. Resolving that name directly against the destination directory lets a crafted entry such as `../../.ssh/authorized_keys` write outside the extraction root; the same normalize-and-startsWith check as for request paths closes the hole.

## Bad

```java
import java.nio.file.Path;
import java.util.zip.ZipEntry;

class Extractor {
    Path target(Path destination, ZipEntry entry) {
        return destination.resolve(entry.getName());
    }
}
```

## Good

```java
import java.nio.file.Path;
import java.util.zip.ZipEntry;

class Extractor {
    Path target(Path destination, ZipEntry entry) {
        Path candidate = destination.resolve(entry.getName()).normalize();
        if (!candidate.startsWith(destination)) {
            throw new IllegalArgumentException("entry escapes destination: " + entry.getName());
        }
        return candidate;
    }
}
```

## See Also

- [java-sec-path-traversal](sec-path-traversal.md) - the same validation for direct file access

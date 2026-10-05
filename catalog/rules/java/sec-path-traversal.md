---
id: java-sec-path-traversal
lang: java
prefix: sec
title: "Normalize and bound user-supplied paths"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [path, traversal, normalize, validation]
  files: ["**/*.java"]
  symbols: [Path.normalize, Path.startsWith]
related: [java-sec-zip-slip, java-io-path-resolve]
sources:
  - title: "Path API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Path.html
---
> Resolve under a base, normalize, then verify the result still starts with the base.

## Why

Path.normalize "returns a path that is this path with redundant name elements eliminated", which is what turns `base/../etc/passwd` into `etc/passwd` relative to the base. Resolving a caller-supplied name without that step lets `..` segments walk out of the intended directory; normalizing first and then checking startsWith(base) rejects the escape before any file is touched.

## Bad

```java
import java.nio.file.Path;

class Storage {
    Path file(Path base, String name) {
        return base.resolve(name);
    }
}
```

## Good

```java
import java.nio.file.Path;

class Storage {
    Path file(Path base, String name) {
        Path candidate = base.resolve(name).normalize();
        if (!candidate.startsWith(base)) {
            throw new IllegalArgumentException("path escapes base: " + name);
        }
        return candidate;
    }
}
```

## See Also

- [java-sec-zip-slip](sec-zip-slip.md) - the same check for archive entries
- [java-io-path-resolve](io-path-resolve.md) - building the path itself

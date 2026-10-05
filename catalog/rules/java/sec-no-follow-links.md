---
id: java-sec-no-follow-links
lang: java
prefix: sec
title: "Validate the resolved real path against the resolved base"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [symlink, torealpath, validation, base]
  files: ["**/*.java"]
  symbols: [Path.toRealPath, LinkOption.NOFOLLOW_LINKS]
related: [java-sec-path-traversal]
sources:
  - title: "Path API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/file/Path.html
---
> Resolve the target first, then check it against the resolved base; NOFOLLOW hides the escape.

## Why

The Path documentation for toRealPath states that "by default, symbolic links are resolved to their final target. If the option NOFOLLOW_LINKS is present then this method does not resolve symbolic links." A validation step that skips link resolution checks the link itself rather than the file it opens, so a link inside the base that points outside passes the check and escapes when the path is opened; resolving first and comparing against the resolved base tests what will actually be opened.

## Bad

```java
import java.io.IOException;
import java.nio.file.LinkOption;
import java.nio.file.Path;

class Links {
    Path resolve(Path base, Path path) throws IOException {
        Path candidate = path.toRealPath(LinkOption.NOFOLLOW_LINKS);
        if (!candidate.startsWith(base)) {
            throw new IllegalArgumentException("path escapes base: " + path);
        }
        return candidate;
    }
}
```

## Good

```java
import java.io.IOException;
import java.nio.file.Path;

class Links {
    Path resolve(Path base, Path path) throws IOException {
        Path real = path.toRealPath();
        if (!real.startsWith(base.toRealPath())) {
            throw new IllegalArgumentException("path escapes base: " + path);
        }
        return real;
    }
}
```

## See Also

- [java-sec-path-traversal](sec-path-traversal.md) - bounding the path before resolving it

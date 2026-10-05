---
id: java-doc-throws
lang: java
prefix: doc
title: "Document declared exceptions with @throws"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, throws, exceptions, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-param, java-doc-tags-order]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> List every exception in the throws clause with @throws; prefer it over the legacy @exception tag.

## Why

The Javadoc specification's method documentation list requires "a throws tag per exception type, checked or unchecked, in the throws clause, if any", and its @exception entry notes that the tag "is equivalent to the throws tag, which is now the recommended form". The generated Throws section is the only place callers learn which failures to handle, and an undocumented exception in a signature is easy to miss when reading the method's documentation.

## Bad

```java
import java.io.IOException;

class Config {
    /**
     * Loads the configuration from disk.
     *
     * @param path the file to read
     * @return the file contents
     */
    static String load(String path) throws IOException {
        return path;
    }
}
```

## Good

```java
import java.io.IOException;

class Config {
    /**
     * Loads the configuration from disk.
     *
     * @param path the file to read
     * @return the file contents
     * @throws IOException if the file cannot be read
     */
    static String load(String path) throws IOException {
        return path;
    }
}
```

## See Also

- [java-doc-param](doc-param.md) - documenting the inputs
- [java-doc-tags-order](doc-tags-order.md) - where @throws sits in the tag order

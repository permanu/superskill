---
id: java-doc-tags-order
lang: java
prefix: doc
title: "Keep block tags in the standard order"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, tags, order, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-param, java-doc-throws]
sources:
  - title: "Google Java Style Guide"
    url: https://google.github.io/styleguide/javaguide.html
---
> Order block tags @param, @return, @throws, @deprecated; keep each tag's description non-empty.

## Why

Google style section 7.1.3 requires that "any of the standard 'block tags' that are used appear in the order @param, @return, @throws, @deprecated, and these four types never appear with an empty description". A stable order lets readers find the same information in the same place on every method, and an empty tag adds noise without adding information.

## Bad

```java
import java.io.IOException;

class Config {
    /**
     * Loads the configuration from disk.
     *
     * @throws IOException if the file cannot be read
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

- [java-doc-param](doc-param.md) - the first tag in the order
- [java-doc-throws](doc-throws.md) - the tag that follows @return

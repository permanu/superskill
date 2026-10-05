---
id: java-doc-package-info
lang: java
prefix: doc
title: "Document packages in package-info.java"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [javadoc, package, package-info, documentation]
  files: ["**/*.java"]
  symbols: [Javadoc]
related: [java-doc-public-coverage]
sources:
  - title: "JavaDoc Documentation Comment Specification"
    url: https://docs.oracle.com/en/java/javase/26/docs/specs/javadoc/doc-comment-spec.html
---
> Put package documentation in package-info.java, the recommended home for a package's doc comment.

## Why

The Javadoc specification says "it is now recommended to provide a documentation comment in a file named package-info.java, which may also contain import statements and annotations for the package declaration", replacing the historical package.html. The package page of the generated documentation comes from that comment, so package-level guidance belongs with the package instead of being scattered across one of its classes.

## Bad

```java
public class Config {
}
```

## Good

```java
/**
 * Provides classes for parsing configuration files.
 */
package com.example.config;
```

## See Also

- [java-doc-public-coverage](doc-public-coverage.md) - the per-type coverage this complements

---
id: java-test-tags
lang: java
prefix: test
title: "Tag slow or environment-bound tests so builds can filter them"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [tag, integration, filter, slow]
  files: ["**/*.java"]
  symbols: [Tag]
related: [java-test-disabled-reason]
sources:
  - title: "JUnit User Guide: Tagging and Filtering"
    url: https://docs.junit.org/6.1.3/writing-tests/tagging-and-filtering.html
---
> Mark integration and slow tests with @Tag so the default build can exclude them.

## Why

The JUnit User Guide states that "test classes and methods can be tagged via the @Tag annotation" and that "those tags can later be used to filter test discovery and execution". Without tags, a test that needs a database or takes minutes is either skipped forever or forced into every local run; a tag lets the same test be part of the nightly pipeline and excluded from the fast unit-test loop.

## Bad

```java
import org.junit.jupiter.api.Test;

class DatabaseTest {
    @Test
    void connects() {
    }
}
```

## Good

```java
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("integration")
class DatabaseTest {
    @Test
    void connects() {
    }
}
```

## See Also

- [java-test-disabled-reason](test-disabled-reason.md) - disabling a single test rather than a category

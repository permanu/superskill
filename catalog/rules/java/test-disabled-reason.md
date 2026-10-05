---
id: java-test-disabled-reason
lang: java
prefix: test
title: "Give @Disabled a reason that names the blocker"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [disabled, skip, reason, ignore]
  files: ["**/*.java"]
  symbols: [Disabled]
related: [java-test-tags]
sources:
  - title: "JUnit User Guide: Disabling Tests"
    url: https://docs.junit.org/6.1.3/writing-tests/disabling-tests.html
---
> Pass @Disabled a short explanation so skipped tests stay traceable.

## Why

The JUnit User Guide notes that "@Disabled may be declared without providing a reason; however, the JUnit team recommends that developers provide a short explanation for why a test class or test method has been disabled", and that some teams require issue numbers for traceability. An unexplained skip is indistinguishable from an abandoned test; a reason names the blocker and the condition under which the test should be re-enabled.

## Bad

```java
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

class ImportTest {
    @Disabled
    @Test
    void importsLegacyFormat() {
    }
}
```

## Good

```java
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

class ImportTest {
    @Disabled("legacy format support returns in the next release")
    @Test
    void importsLegacyFormat() {
    }
}
```

## See Also

- [java-test-tags](test-tags.md) - excluding whole categories of tests by environment

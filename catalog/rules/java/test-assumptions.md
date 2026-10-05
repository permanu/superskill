---
id: java-test-assumptions
lang: java
prefix: test
title: "Skip environment-bound tests with assumptions"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [junit, assumptions, skip, environment]
  files: ["**/*.java"]
  symbols: [Assumptions.assumeTrue]
related: [java-test-tags]
sources:
  - title: "JUnit User Guide: Assumptions"
    url: https://docs.junit.org/6.1.3/writing-tests/assumptions.html
---
> Abort the test with an assumption instead of returning early; the report records a skip.

## Why

The JUnit assumptions guide explains that an assumption "throws an exception of type org.opentest4j.TestAbortedException to signal that the test should be aborted instead of marked as a failure", and the examples use assumeTrue to gate tests on the environment. A silent early return marks the test as passed, so the report cannot distinguish "checked and fine" from "never ran"; an aborted test is reported as skipped.

## Bad

```java
import org.junit.jupiter.api.Test;

class CiTest {
    @Test
    void onlyOnCi() {
        if (!"CI".equals(System.getenv("ENV"))) {
            return;
        }
        // assertions
    }
}
```

## Good

```java
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import org.junit.jupiter.api.Test;

class CiTest {
    @Test
    void onlyOnCi() {
        assumeTrue("CI".equals(System.getenv("ENV")));
        // assertions
    }
}
```

## See Also

- [java-test-tags](test-tags.md) - filtering tests by category instead of the environment

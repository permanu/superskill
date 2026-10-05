---
id: java-test-assert-all
lang: java
prefix: test
title: "Group related assertions with assertAll so every failure is reported"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertAll, grouped, failure, report]
  files: ["**/*.java"]
  symbols: [assertAll]
related: [java-test-assert-message-lazy]
sources:
  - title: "JUnit User Guide: Assertions"
    url: https://docs.junit.org/6.1.3/writing-tests/assertions.html
---
> Wrap independent assertions of one behavior in assertAll so one run shows every mismatch.

## Why

The JUnit User Guide states that in a grouped assertion "all assertions are executed, and all failures will be reported together". Sequential assertions stop at the first failure, so a broken object needs one test run per defect to reveal all of them; assertAll reports the whole set in one run, which shortens the fix loop for multi-field checks.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PointTest {
    @Test
    void coordinates() {
        Point point = new Point(3, 4);
        assertEquals(3, point.x());
        assertEquals(4, point.y());
    }
}

record Point(int x, int y) {
}
```

## Good

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PointTest {
    @Test
    void coordinates() {
        Point point = new Point(3, 4);
        assertAll(
                () -> assertEquals(3, point.x()),
                () -> assertEquals(4, point.y()));
    }
}

record Point(int x, int y) {
}
```

## See Also

- [java-test-assert-message-lazy](test-assert-message-lazy.md) - keeping failure messages cheap

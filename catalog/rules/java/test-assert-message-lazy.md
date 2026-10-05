---
id: java-test-assert-message-lazy
lang: java
prefix: test
title: "Pass assertion messages as a Supplier so they are built only on failure"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assert, message, supplier, lazy]
  files: ["**/*.java"]
  symbols: [assertTrue, Supplier]
related: [java-test-assert-all]
sources:
  - title: "JUnit User Guide: Assertions"
    url: https://docs.junit.org/6.1.3/writing-tests/assertions.html
---
> Build expensive assertion messages inside a lambda so passing tests never pay for them.

## Why

The JUnit User Guide states that with a Supplier<String> "the message is evaluated lazily... it is only evaluated when the assertion fails", which matters when message construction is "complex or time-consuming". Passing a pre-built string pays the cost on every run, including the passing runs that dominate a suite; the lambda defers it to the failure path where it is needed.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportTest {
    @Test
    void marksLongText() {
        String text = "a".repeat(1000);
        assertTrue(text.length() > 500, describe(text));
    }

    private static String describe(String text) {
        return "expected more than 500 characters but got " + text.length();
    }
}
```

## Good

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ReportTest {
    @Test
    void marksLongText() {
        String text = "a".repeat(1000);
        assertTrue(text.length() > 500, () -> describe(text));
    }

    private static String describe(String text) {
        return "expected more than 500 characters but got " + text.length();
    }
}
```

## See Also

- [java-test-assert-all](test-assert-all.md) - grouping assertions that report together

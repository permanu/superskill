---
id: java-test-assert-throws
lang: java
prefix: test
title: "Use assertThrows to test exception behavior instead of try/fail/catch"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [assertThrows, exception, test, catch]
  files: ["**/*.java"]
  symbols: [assertThrows]
related: [java-test-assert-message-lazy, java-err-no-empty-catch]
sources:
  - title: "JUnit User Guide: Exception Handling"
    url: https://docs.junit.org/6.1.3/writing-tests/exception-handling.html
  - title: "Error Prone: EmptyCatch"
    url: https://errorprone.info/bugpattern/EmptyCatch
---
> Assert expected exceptions with assertThrows and inspect the returned exception.

## Why

The JUnit User Guide describes assertThrows as verifying "that a particular type of exception is thrown", checking subclasses, and returning "the thrown exception object to allow performing additional assertions on it". The hand-written try/fail/catch pattern needs an empty catch block to pass, hides the thrown instance from message assertions, and fails with a generic message when no exception arrives; Error Prone recommends assertThrows over try-catch for exactly this case.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.fail;

class ParserTest {
    @Test
    void rejectsBlank() {
        try {
            new Parser().parse(" ");
            fail("expected exception");
        } catch (IllegalArgumentException expected) {
        }
    }
}

class Parser {
    int parse(String text) {
        if (text.isBlank()) {
            throw new IllegalArgumentException("blank");
        }
        return text.length();
    }
}
```

## Good

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class ParserTest {
    @Test
    void rejectsBlank() {
        assertThrows(IllegalArgumentException.class, () -> new Parser().parse(" "));
    }
}

class Parser {
    int parse(String text) {
        if (text.isBlank()) {
            throw new IllegalArgumentException("blank");
        }
        return text.length();
    }
}
```

## See Also

- [java-test-assert-message-lazy](test-assert-message-lazy.md) - assertion messages on the failure path
- [java-err-no-empty-catch](err-no-empty-catch.md) - the empty catch this pattern forces

---
id: java-test-parameterized
lang: java
prefix: test
title: "Run the same test over several inputs with @ParameterizedTest"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameterized, valuesource, csvsource, data]
  files: ["**/*.java"]
  symbols: [ParameterizedTest, CsvSource]
related: [java-test-dynamic-tests]
sources:
  - title: "JUnit User Guide: Parameterized Classes and Tests"
    url: https://docs.junit.org/6.1.3/writing-tests/parameterized-classes-and-tests.html
---
> Declare each input as a parameterized invocation instead of looping inside one test.

## Why

The JUnit User Guide describes parameterized tests as running "a test method multiple times with different arguments", and notes that "each invocation will be reported separately". A loop inside a single test method stops at the first failing input and reports one result for all inputs, so the failing case has to be dug out of the message; parameterized invocations identify the failing arguments in the test report itself.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RomanTest {
    @Test
    void converts() {
        for (int value = 1; value <= 3; value++) {
            assertEquals("I".repeat(value), new Roman().toRoman(value));
        }
    }
}

class Roman {
    String toRoman(int value) {
        return "I".repeat(value);
    }
}
```

## Good

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RomanTest {
    @ParameterizedTest
    @CsvSource({"1, I", "2, II", "3, III"})
    void converts(int value, String expected) {
        assertEquals(expected, new Roman().toRoman(value));
    }
}

class Roman {
    String toRoman(int value) {
        return "I".repeat(value);
    }
}
```

## See Also

- [java-test-dynamic-tests](test-dynamic-tests.md) - when the case list is generated at runtime

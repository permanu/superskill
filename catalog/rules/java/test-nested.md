---
id: java-test-nested
lang: java
prefix: test
title: "Group related cases in @Nested classes to express the tested state"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nested, hierarchy, grouping, structure]
  files: ["**/*.java"]
  symbols: [Nested]
related: [java-test-no-order-dependency]
sources:
  - title: "JUnit User Guide: Nested Tests"
    url: https://docs.junit.org/6.1.3/writing-tests/nested-tests.html
---
> Use @Nested classes to keep the setup of a state next to the cases that exercise it.

## Why

The JUnit User Guide says "@Nested tests give the test writer more capabilities to express the relationship among several groups of tests" and "facilitate hierarchical thinking about the test structure", with outer setup methods running before inner tests. Flat test classes force state into every method name or shared fields; nesting puts the setup for "when empty" beside the cases that depend on it, and each nested group can still be run independently.

## Bad

```java
import java.util.ArrayDeque;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class StackTest {
    @Test
    void emptyStackIsEmpty() {
        assertTrue(new ArrayDeque<>().isEmpty());
    }

    @Test
    void emptyStackSizeIsZero() {
        assertTrue(new ArrayDeque<>().size() == 0);
    }
}
```

## Good

```java
import java.util.ArrayDeque;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class StackTest {
    @Nested
    class WhenEmpty {
        @Test
        void isEmpty() {
            assertTrue(new ArrayDeque<>().isEmpty());
        }
    }
}
```

## See Also

- [java-test-no-order-dependency](test-no-order-dependency.md) - keeping the state inside each group

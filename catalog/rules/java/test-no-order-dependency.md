---
id: java-test-no-order-dependency
lang: java
prefix: test
title: "Do not let tests depend on execution order; reset shared state per test"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [order, shared, state, isolation]
  files: ["**/*.java"]
  symbols: [BeforeEach]
related: [java-test-nested, java-test-tempdir]
sources:
  - title: "JUnit User Guide: Test Execution Order"
    url: https://docs.junit.org/6.1.3/writing-tests/test-execution-order.html
---
> Give every test its own fixture; never let one test's mutations feed another.

## Why

The JUnit User Guide states that tests "will be ordered using an algorithm that is deterministic but intentionally nonobvious", and that "true unit tests typically should not rely on the order in which they are executed". A static collection that one test fills and another asserts on encodes that hidden order into the suite: the second test passes or fails depending on which ran first, and a filtered single-test run fails outright.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CartTest {
    static final List<String> ITEMS = new ArrayList<>();

    @Test
    void addsItem() {
        ITEMS.add("book");
        assertEquals(1, ITEMS.size());
    }

    @Test
    void keepsItem() {
        assertEquals(1, ITEMS.size());
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CartTest {
    private List<String> items;

    @BeforeEach
    void setUp() {
        items = new ArrayList<>();
    }

    @Test
    void addsItem() {
        items.add("book");
        assertEquals(1, items.size());
    }
}
```

## See Also

- [java-test-nested](test-nested.md) - scoping setup to the group that needs it
- [java-test-tempdir](test-tempdir.md) - the filesystem version of per-test isolation

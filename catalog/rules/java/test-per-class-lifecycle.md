---
id: java-test-per-class-lifecycle
lang: java
prefix: test
title: "Share expensive setup with a per-class test instance"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [junit, testinstance, lifecycle, setup]
  files: ["**/*.java"]
  symbols: [TestInstance]
related: [java-test-nested]
sources:
  - title: "JUnit User Guide: Test Instance Lifecycle"
    url: https://docs.junit.org/6.1.3/writing-tests/test-instance-lifecycle.html
---
> Use @TestInstance(PER_CLASS) when tests share setup that is expensive to rebuild.

## Why

The JUnit lifecycle guide says that to use the same test instance across methods, "annotate your test class with @TestInstance(Lifecycle.PER_CLASS). When using this mode, a new test instance will be created once per test class", which also lets @BeforeAll run as a non-static method. Rebuilding an expensive fixture before every test multiplies the setup cost by the number of tests; the per-class instance builds it once and lets @BeforeEach reset only what each test changes.

## Bad

```java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReportTest {
    private Database database;

    @BeforeEach
    void setUp() {
        database = new Database();
    }

    @Test
    void empty() {
        database.open();
    }
}

class Database {
    void open() {
    }
}
```

## Good

```java
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ReportTest {
    private Database database;

    @BeforeAll
    void setUp() {
        database = new Database();
    }

    @Test
    void empty() {
        database.open();
    }
}

class Database {
    void open() {
    }
}
```

## See Also

- [java-test-nested](test-nested.md) - grouping cases that share a fixture

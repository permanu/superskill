---
id: java-test-dynamic-tests
lang: java
prefix: test
title: "Generate runtime-defined cases as dynamic tests with @TestFactory"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dynamic, testfactory, generated, runtime]
  files: ["**/*.java"]
  symbols: [TestFactory, DynamicTest]
related: [java-test-parameterized]
sources:
  - title: "JUnit User Guide: Dynamic Tests"
    url: https://docs.junit.org/6.1.3/writing-tests/dynamic-tests.html
---
> Return DynamicTest instances from a @TestFactory when the cases are computed at runtime.

## Why

The JUnit User Guide explains that a @TestFactory method "is not itself a test case but rather a factory for test cases", and that "DynamicTest instances will be executed lazily, enabling dynamic and even non-deterministic generation of test cases". Cases derived from runtime data cannot be listed in a @CsvSource; producing them as dynamic tests reports each generated case with its own display name instead of collapsing them into one pass/fail result.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PrimeTest {
    @Test
    void primes() {
        for (int candidate : new int[] {2, 3, 5, 7}) {
            assertTrue(isPrime(candidate));
        }
    }

    private boolean isPrime(int value) {
        return value > 1;
    }
}
```

## Good

```java
import java.util.stream.Stream;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import static org.junit.jupiter.api.Assertions.assertTrue;

class PrimeTest {
    @TestFactory
    Stream<DynamicTest> primes() {
        return Stream.of(2, 3, 5, 7)
                .map(candidate -> DynamicTest.dynamicTest(
                        candidate + " is prime", () -> assertTrue(isPrime(candidate))));
    }

    private boolean isPrime(int value) {
        return value > 1;
    }
}
```

## See Also

- [java-test-parameterized](test-parameterized.md) - the declarative form for fixed case lists

---
id: java-test-timeout
lang: java
prefix: test
title: "Bound every potentially hanging test with @Timeout"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timeout, hang, await, asynchronous]
  files: ["**/*.java"]
  symbols: [Timeout, CountDownLatch]
related: [java-test-no-order-dependency]
sources:
  - title: "JUnit User Guide: Timeouts"
    url: https://docs.junit.org/6.1.3/writing-tests/timeouts.html
---
> Declare a maximum duration on tests that wait so a stuck dependency fails instead of hanging the suite.

## Why

The JUnit User Guide states that "@Timeout allows one to declare that a test... should fail if its execution time exceeds a given duration", and in its polling example: "By configuring a timeout for an asynchronous test that polls, you can ensure that the test does not execute indefinitely." A test blocked on a latch or an external system without a deadline occupies a build agent until someone kills it; the annotation converts that hang into a normal failure.

## Bad

```java
import java.util.concurrent.CountDownLatch;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WorkerTest {
    @Test
    void finishes() throws InterruptedException {
        CountDownLatch done = new CountDownLatch(1);
        new Thread(done::countDown).start();
        done.await();
        assertEquals(0, done.getCount());
    }
}
```

## Good

```java
import java.util.concurrent.CountDownLatch;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WorkerTest {
    @Test
    @Timeout(5)
    void finishes() throws InterruptedException {
        CountDownLatch done = new CountDownLatch(1);
        new Thread(done::countDown).start();
        done.await();
        assertEquals(0, done.getCount());
    }
}
```

## See Also

- [java-test-no-order-dependency](test-no-order-dependency.md) - the other way shared test infrastructure leaks between runs

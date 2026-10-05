---
id: java-test-inject-clock
lang: java
prefix: test
title: "Drive time-dependent logic from an injected Clock instead of sleeping"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [clock, time, sleep, deterministic]
  files: ["**/*.java"]
  symbols: [Clock, Thread.sleep]
related: [java-test-timeout, java-type-value-based-identity]
sources:
  - title: "Clock API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/time/Clock.html
---
> Pass a Clock into time-dependent code and test with Clock.fixed instead of waiting for real time.

## Why

The Clock API states that "best practice for applications is to pass a Clock into any method that requires the current instant and time-zone", because that "allows an alternative clock, such as fixed or offset to be used during testing". A test that sleeps and then reads the system clock is slow, still races the production code's own time read, and cannot test boundary conditions that are hours away; a fixed clock makes every instant an input.

## Bad

```java
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenTest {
    @Test
    void expiresAfterOneHour() throws InterruptedException {
        Token token = new Token();
        Thread.sleep(50);
        assertTrue(token.isExpired(System.currentTimeMillis()));
    }
}

class Token {
    boolean isExpired(long nowMillis) {
        return false;
    }
}
```

## Good

```java
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenTest {
    @Test
    void expiresAfterOneHour() {
        Instant issued = Instant.parse("2026-01-01T00:00:00Z");
        Clock clock = Clock.fixed(issued.plus(Duration.ofHours(2)), ZoneOffset.UTC);
        assertTrue(new Token().isExpired(issued, clock.instant(), Duration.ofHours(1)));
    }
}

class Token {
    boolean isExpired(Instant issued, Instant now, Duration ttl) {
        return now.isAfter(issued.plus(ttl));
    }
}
```

## See Also

- [java-test-timeout](test-timeout.md) - the backstop for tests that must wait
- [java-type-value-based-identity](type-value-based-identity.md) - java.time values are value-based

---
id: java-sec-secure-random-reuse
lang: java
prefix: sec
title: "Share one SecureRandom instance; it is safe for concurrent use"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [securerandom, entropy, thread-safety, reuse]
  files: ["**/*.java"]
  symbols: [SecureRandom]
related: [java-sec-securerandom]
sources:
  - title: "SecureRandom API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/security/SecureRandom.html
---
> Keep a long-lived SecureRandom; constructing one per call re-seeds from entropy.

## Why

The SecureRandom API states that "SecureRandom objects are safe for use by multiple concurrent threads", and that "the first call to nextBytes will force it to seed itself from an implementation-specific entropy source". Creating a generator per token pays the seeding cost every time, and the API notes that "the generateSeed, reseed and nextBytes methods may block as entropy is being gathered", so per-call construction can stall request threads.

## Bad

```java
import java.security.SecureRandom;

class Tokens {
    long nextToken() {
        return new SecureRandom().nextLong();
    }
}
```

## Good

```java
import java.security.SecureRandom;

class Tokens {
    private static final SecureRandom RANDOM = new SecureRandom();

    long nextToken() {
        return RANDOM.nextLong();
    }
}
```

## See Also

- [java-sec-securerandom](sec-securerandom.md) - choosing the secure generator

---
id: java-sec-securerandom
lang: java
prefix: sec
title: "Generate tokens and keys with SecureRandom, never java.util.Random"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, token, secure, secrets]
  files: ["**/*.java"]
  symbols: [SecureRandom, Random]
related: [java-sec-secure-random-reuse]
sources:
  - title: "SecureRandom API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/security/SecureRandom.html
---
> Use the cryptographically strong generator for anything an attacker must not predict.

## Why

SecureRandom "provides a cryptographically strong random number generator (RNG)" whose output "must be cryptographically strong", with seed material that "must be unpredictable". java.util.Random is a deterministic linear PRNG whose sequence can be reconstructed from a small amount of output, so session tokens, password-reset codes, and keys generated from it are predictable.

## Bad

```java
import java.util.Random;

class Tokens {
    private final Random random = new Random();

    long nextToken() {
        return random.nextLong();
    }
}
```

## Good

```java
import java.security.SecureRandom;

class Tokens {
    private final SecureRandom random = new SecureRandom();

    long nextToken() {
        return random.nextLong();
    }
}
```

## See Also

- [java-sec-secure-random-reuse](sec-secure-random-reuse.md) - sharing the instance safely

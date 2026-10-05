---
id: java-num-random-bound
lang: java
prefix: num
title: "Draw bounded random numbers with nextInt(bound), not modulo"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, bound, modulo, uniformity]
  files: ["**/*.java"]
  symbols: [Random.nextInt]
related: [java-perf-threadlocalrandom]
sources:
  - title: "Random API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Random.html
---
> Ask nextInt for the range directly; folding nextInt() with % skews the distribution.

## Why

Random.nextInt(int bound) "returns a pseudorandom, uniformly distributed int value between 0 (inclusive) and the specified value (exclusive)", and the documented implementation "rejects values that would result in an uneven distribution (due to the fact that 2^31 is not divisible by n)". Taking `nextInt() % bound` performs no such rejection, so the low values are slightly more likely than the high ones — a bias that grows with the bound.

## Bad

```java
import java.util.Random;

class Dice {
    private final Random random = new Random();

    int roll() {
        return Math.abs(random.nextInt()) % 6 + 1;
    }
}
```

## Good

```java
import java.util.Random;

class Dice {
    private final Random random = new Random();

    int roll() {
        return random.nextInt(6) + 1;
    }
}
```

## See Also

- [java-perf-threadlocalrandom](perf-threadlocalrandom.md) - the generator choice in concurrent code

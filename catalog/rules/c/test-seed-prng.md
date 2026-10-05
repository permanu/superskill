---
id: c-test-seed-prng
lang: c
prefix: test
title: Seed the PRNG from the test, not from the clock
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rand, srand, seed, reproducibility, tests]
  files: ["**/*.c"]
  symbols: [srand, rand]
related: [c-sec-random, c-test-deterministic-compare]
sources:
  - title: cppreference - rand
    url: https://en.cppreference.com/w/c/numeric/random/rand
---
> Call `srand` once with a fixed seed in the test harness; production code must not seed itself.

## Why

cppreference states that each time `rand` is seeded with `srand`, it must produce the same sequence of values. A test that seeds from the clock therefore produces a different input every run, so a failure cannot be reproduced from the report and flakiness cannot be diagnosed. The harness owns the seed; the code under test only consumes the generator.

## Bad

```c
#include <stdlib.h>
#include <time.h>

void shuffle(int *v, int n) {
    srand((unsigned)time(NULL));   /* a different sequence every run */
    for (int i = 0; i < n; ++i) {
        int j = rand() % (i + 1);
        int t = v[i];
        v[i] = v[j];
        v[j] = t;
    }
}
```

## Good

```c
#include <stdlib.h>

void shuffle(int *v, int n) {
    for (int i = 0; i < n; ++i) {
        int j = rand() % (i + 1);   /* the test seeds once with a fixed value */
        int t = v[i];
        v[i] = v[j];
        v[j] = t;
    }
}
```

## See Also

- [c-sec-random](sec-random.md) - why this generator must never guard a secret
- [c-test-deterministic-compare](test-deterministic-compare.md) - the other source of flaky tests

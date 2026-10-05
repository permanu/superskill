---
id: cpp-test-seeded-random
lang: cpp
prefix: test
title: Seed random number generators explicitly so failures reproduce
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, seed, reproducible, mt19937]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::mt19937, std::random_device]
related: [cpp-test-isolation, cpp-test-data-driven]
sources:
  - title: cppreference - std::mersenne_twister_engine
    url: https://en.cppreference.com/w/cpp/numeric/random/mersenne_twister_engine
---
> Fix the seed in tests; a random_device-seeded run cannot be replayed after it fails.

## Why

A test that seeds from `std::random_device` produces a different sequence every run, so a failure observed once may never appear again and cannot be replayed on demand. Mersenne Twister and the other standard engines produce a deterministic sequence from a given seed, so a fixed seed makes every run identical. When variety is wanted, iterate over a small set of known seeds and report the seed in the failure output.

## Bad

```cpp
#include <random>

int random_level() {
    std::random_device device; // different every run: failures are unreproducible
    std::mt19937 engine(device());
    return std::uniform_int_distribution<int>(1, 10)(engine);
}
```

## Good

```cpp
#include <cstdlib>
#include <random>

int random_level(unsigned seed) {
    std::mt19937 engine(seed); // deterministic: the run can be replayed
    return std::uniform_int_distribution<int>(1, 10)(engine);
}

void test_random_level() {
    if (random_level(12345) != random_level(12345))
        std::abort(); // same seed, same sequence
}
```

## See Also

- [cpp-test-isolation](test-isolation.md) - determinism as part of test independence
- [cpp-test-data-driven](test-data-driven.md) - enumerating the seeds as data

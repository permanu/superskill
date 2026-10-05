---
id: cpp-sec-crypto-random
lang: cpp
prefix: sec
title: Draw security values from a cryptographic source, not rand or a PRNG
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, token, session, crypto]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::rand, std::random_device]
related: [cpp-test-seeded-random, cpp-sec-no-hardcoded-secrets]
sources:
  - title: "CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)"
    url: https://cwe.mitre.org/data/definitions/338.html
  - title: cppreference - std::random_device
    url: https://en.cppreference.com/w/cpp/numeric/random/random_device
---
> Session ids and keys come from the OS entropy source; statistical generators are predictable.

## Why

`std::rand` and seeded engines are designed for simulations and tests: their state is small and recoverable from a few outputs, so CWE-338 records tokens and keys built from them being guessed, brute-forced, or replayed. `std::random_device` is the standard facility for non-deterministic random numbers, producing values from the implementation's entropy source instead of a reproducible sequence, which is what authentication, session identifiers, and keys require.

## Bad

```cpp
#include <cstdlib>

unsigned int session_token() {
    return static_cast<unsigned int>(std::rand()); // predictable sequence
}

int main() {
    return session_token() == 0 ? 1 : 0;
}
```

## Good

```cpp
#include <cstdint>
#include <random>

std::uint64_t session_token() {
    std::random_device source; // implementation-provided entropy
    return (static_cast<std::uint64_t>(source()) << 32) ^ source();
}

int main() {
    return session_token() == 0 ? 1 : 0;
}
```

## See Also

- [cpp-test-seeded-random](test-seeded-random.md) - the same generators, used correctly for tests
- [cpp-sec-no-hardcoded-secrets](sec-no-hardcoded-secrets.md) - where the generated value must not end up

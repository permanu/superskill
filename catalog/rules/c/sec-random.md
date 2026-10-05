---
id: c-sec-random
lang: c
prefix: sec
title: Use the operating system's randomness for tokens, not rand()
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rand, random, CSPRNG, token, session]
  files: ["**/*.c", "**/*.h"]
  symbols: [rand, srand, arc4random_buf]
related: [c-sec-hardcoded-secrets]
sources:
  - title: SEI CERT C - MSC30-C, do not use the rand() function for generating pseudorandom numbers
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/miscellaneous-msc/msc30-c/
---
> Generate security tokens with a CSPRNG from the platform, never with `rand()`.

## Why

`rand()` makes no quality guarantees: implementations with short cycles and predictable output are common, and a seedable PRNG can be reconstructed from a few outputs. Session identifiers, tokens, and nonces generated from it are guessable. Use the operating system's cryptographic generator (`arc4random`, `getrandom`, or the platform equivalent).

## Bad

```c
#include <stdlib.h>

unsigned session_token(void) {
    return (unsigned)rand();   /* predictable PRNG, not cryptographic */
}
```

## Good

```c
#include <stdlib.h>

unsigned session_token(void) {
    unsigned token = 0;
    arc4random_buf(&token, sizeof token);   /* OS-backed randomness */
    return token;
}
```

## See Also

- [c-sec-hardcoded-secrets](sec-hardcoded-secrets.md) - the other half of unpredictable credentials

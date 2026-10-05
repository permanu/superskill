---
id: c-data-hash-unsigned
lang: c
prefix: data
title: Compute hashes and checksums in unsigned arithmetic
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hash, checksum, unsigned, overflow]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-conv-bitwise-unsigned, c-unsafe-char-signedness]
sources:
  - title: cppreference - Arithmetic operators
    url: https://en.cppreference.com/w/c/language/operator_arithmetic
---
> Use unsigned accumulators so multiplication and addition wrap by definition.

## Why

Hash and checksum mixing multiplies and adds with deliberate wraparound; in signed arithmetic that overflow is undefined behavior and the compiler may optimize the mixing away. Unsigned arithmetic is defined to be modulo the type's range, which is exactly the mixing function. Convert bytes through `unsigned char` as well, so the values are 0 to 255.

## Bad

```c
#include <stddef.h>

int hash_bytes(const char *data, size_t n) {
    int h = 0;
    for (size_t i = 0; i < n; ++i) {
        h = h * 31 + data[i];   /* signed overflow is undefined */
    }
    return h;
}
```

## Good

```c
#include <stddef.h>
#include <stdint.h>

uint32_t hash_bytes(const char *data, size_t n) {
    uint32_t h = 0;
    for (size_t i = 0; i < n; ++i) {
        h = h * 31u + (unsigned char)data[i];   /* unsigned wrap is defined */
    }
    return h;
}
```

## See Also

- [c-conv-bitwise-unsigned](conv-bitwise-unsigned.md) - the same domain for bit operations
- [c-unsafe-char-signedness](unsafe-char-signedness.md) - reading the bytes as unsigned values

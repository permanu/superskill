---
id: c-ptr-strict-alias
lang: c
prefix: ptr
title: Access an object only through its effective type, a compatible type, or a character type
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [strict aliasing, type punning, effective type, memcpy]
  files: ["**/*.c", "**/*.h"]
  symbols: [memcpy]
related: [c-ptr-byte-access, c-ptr-restrict-contract]
sources:
  - title: SEI CERT C - EXP39-C, do not access a variable through a pointer of an incompatible type
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/expressions-exp/exp39-c/
  - title: cppreference - Objects and alignment
    url: https://en.cppreference.com/w/c/language/object
---
> Reinterpret values by copying bytes, not by reading an object through an incompatible lvalue type.

## Why

An object may be accessed only through a compatible type, a qualified or signed/unsigned counterpart, an aggregate containing that type, or a character type. Any other lvalue type is undefined behavior, and optimizing compilers use the rule to assume two differently typed pointers never alias. `memcpy` through a byte buffer performs the same bit reinterpretation without breaking the rule.

## Bad

```c
#include <stdio.h>

void bump(float *f) {
    int *ip = (int *)f;   /* incompatible lvalue type */
    (*ip)++;              /* undefined behavior */
    printf("%f\n", (double)*f);
}
```

## Good

```c
#include <stdio.h>
#include <string.h>

void bump(float *f) {
    int bits = 0;
    memcpy(&bits, f, sizeof bits);   /* copy bytes, do not alias */
    ++bits;
    memcpy(f, &bits, sizeof bits);
    printf("%f\n", (double)*f);
}
```

## See Also

- [c-ptr-byte-access](ptr-byte-access.md) - the character type that may inspect any object
- [c-ptr-restrict-contract](ptr-restrict-contract.md) - the aliasing promise restrict depends on

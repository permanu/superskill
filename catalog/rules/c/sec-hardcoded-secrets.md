---
id: c-sec-hardcoded-secrets
lang: c
prefix: sec
title: Load secrets from outside the binary, never hard-code them
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hardcoded, password, key, secret, strings]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-sec-wipe-secrets, c-sec-copy-env-results]
sources:
  - title: SEI CERT C - MSC41-C, never hard code sensitive information
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/miscellaneous-msc/msc41-c/
---
> Supply secrets at runtime and keep them out of the executable's readable data.

## Why

String literals live in the binary, where anyone with the file can recover them with a text search, and rotating a compiled-in secret requires shipping a patch. Authentication codes and keys must come from configuration, the environment, or a key store. The program then handles a value it did not author, which can be wiped after use.

## Bad

```c
#include <string.h>

int check_password(const char *given) {
    return strcmp(given, "hunter2") == 0;   /* secret in the binary */
}
```

## Good

```c
#include <stdlib.h>
#include <string.h>

int check_password(const char *given) {
    const char *expected = getenv("APP_PASSWORD");   /* secret from outside */
    if (expected == NULL) {
        return 0;
    }
    return strcmp(given, expected) == 0;
}
```

## See Also

- [c-sec-wipe-secrets](sec-wipe-secrets.md) - clearing the value once it has been used
- [c-sec-copy-env-results](sec-copy-env-results.md) - handling environment values safely

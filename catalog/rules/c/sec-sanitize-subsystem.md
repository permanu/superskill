---
id: c-sec-sanitize-subsystem
lang: c
prefix: sec
title: Allowlist characters before passing data to a complex subsystem
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [sanitize, allowlist, subsystem, path traversal, injection]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-sec-no-system, c-sec-descriptor-identity]
sources:
  - title: SEI CERT C - STR02-C, sanitize data passed to complex subsystems
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/characters-and-strings-str/str02-c/
---
> Define the characters the subsystem may receive and reject everything else before the data crosses over.

## Why

Subsystems interpret metacharacters: shells run commands, databases run SQL, path lookups follow `..`. Blacklists miss encodings and variations; an allowlist of characters that are meaningful for the data is small, testable, and fails closed. Validate once at the boundary, before the value reaches the subsystem.

## Bad

```c
#include <stdio.h>

FILE *open_user_report(const char *name) {
    char path[256];
    snprintf(path, sizeof path, "reports/%s.txt", name);
    return fopen(path, "r");   /* ../ in name escapes the directory */
}
```

## Good

```c
#include <stdio.h>

static int is_plain_name(const char *name) {
    if (name[0] == '\0') {
        return 0;
    }
    for (const char *p = name; *p != '\0'; ++p) {
        int ok = (*p >= 'a' && *p <= 'z') || (*p >= 'A' && *p <= 'Z') ||
                 (*p >= '0' && *p <= '9') || *p == '_';
        if (!ok) {
            return 0;   /* allowlist: no separators or metacharacters */
        }
    }
    return 1;
}

FILE *open_user_report(const char *name) {
    if (!is_plain_name(name)) {
        return NULL;
    }
    char path[256];
    snprintf(path, sizeof path, "reports/%s.txt", name);
    return fopen(path, "r");
}
```

## See Also

- [c-sec-no-system](sec-no-system.md) - removing the shell from the path entirely
- [c-sec-descriptor-identity](sec-descriptor-identity.md) - binding the name to one object

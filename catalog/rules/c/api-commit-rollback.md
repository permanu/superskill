---
id: c-api-commit-rollback
lang: c
prefix: api
title: Leave state unchanged when an update fails
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [commit, rollback, atomic update, partial state]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-api-validate-params, c-err-out-params]
sources:
  - title: SEI CERT C - API00-C, functions should validate their parameters
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/application-programming-interfaces-api/api00-c/
---
> Validate first, build the new value aside, and commit it in one assignment.

## Why

CERT's compliant solution notes that commit-or-rollback semantics, leaving program state unchanged on error, are desirable for error safety. A setter that writes field by field and then discovers a bad argument leaves the object half-updated, and the caller has no way to know which fields changed. Computing the new value in a temporary and assigning it once makes failure atomic.

## Bad

```c
#include <string.h>

struct config {
    char name[32];
    int retries;
};

int update_config(struct config *c, const char *name, int retries) {
    strncpy(c->name, name, sizeof c->name);   /* state mutated before the check */
    if (retries < 0) {
        return -1;   /* caller's config is now half-updated */
    }
    c->retries = retries;
    return 0;
}
```

## Good

```c
#include <string.h>

struct config {
    char name[32];
    int retries;
};

int update_config(struct config *c, const char *name, int retries) {
    if (retries < 0 || strlen(name) >= sizeof c->name) {
        return -1;   /* nothing is written until all checks pass */
    }
    struct config next = *c;
    strcpy(next.name, name);
    next.retries = retries;
    *c = next;   /* commit */
    return 0;
}
```

## See Also

- [c-api-validate-params](api-validate-params.md) - where the checks belong
- [c-err-out-params](err-out-params.md) - the same discipline for outputs

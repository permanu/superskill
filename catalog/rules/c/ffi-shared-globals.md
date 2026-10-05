---
id: c-ffi-shared-globals
lang: c
prefix: ffi
title: Do not share mutable globals across a boundary
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [global, mutable state, accessors, module boundary]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-proj-internal-linkage, c-pat-init-destroy]
sources:
  - title: cppreference - External and tentative definitions
    url: https://en.cppreference.com/w/c/language/extern
---
> Keep module state private and expose accessor functions; a writable global is shared state with no contract.

## Why

An external object definition is visible and writable by every translation unit, so any module can change it at any time and no function can maintain an invariant over it. cppreference describes these definitions as part of the program's link surface, which means the mutable state becomes part of the interface. Accessors keep the storage private and give every change one checked path.

## Bad

```c
int shared_counter = 0;   /* writable global shared by every module */
```

## Good

```c
static int counter = 0;

int counter_get(void) {
    return counter;   /* state stays private behind accessors */
}

void counter_bump(void) {
    ++counter;
}
```

## See Also

- [c-proj-internal-linkage](proj-internal-linkage.md) - keeping names inside the translation unit
- [c-pat-init-destroy](pat-init-destroy.md) - the lifecycle for the state that remains

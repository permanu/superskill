---
id: c-ffi-dlsym-conversion
lang: c
prefix: ffi
title: Distinguish a missing dlsym symbol from a null-valued one with dlerror
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dlsym, dlerror, dynamic linking, symbol]
  files: ["**/*.c"]
  symbols: [dlsym, dlerror]
related: [c-ptr-fn-pointer-cast, c-ptr-null-check]
sources:
  - title: Linux man-pages - dlsym(3)
    url: https://man7.org/linux/man-pages/man3/dlsym.3.html
---
> Clear dlerror, call dlsym, and check dlerror again; a NULL result is not by itself an error.

## Why

The dlsym manual states that a symbol's value can legitimately be NULL, so a NULL return need not indicate a missing symbol; the documented protocol is to call `dlerror` before, call `dlsym`, then call `dlerror` again and check the saved result. Casting the result to the exact function pointer type is the POSIX-sanctioned conversion. Skipping the protocol misreports a valid null-valued symbol as an error.

## Bad

```c
#include <dlfcn.h>

typedef int (*entry_fn)(int);

entry_fn load_entry(void *handle) {
    return (entry_fn)dlsym(handle, "entry");   /* NULL is also a valid symbol value */
}
```

## Good

```c
#include <dlfcn.h>
#include <stddef.h>

typedef int (*entry_fn)(int);

int load_entry(void *handle, entry_fn *out) {
    dlerror();                          /* clear any old error state */
    entry_fn fn = (entry_fn)dlsym(handle, "entry");
    if (dlerror() != NULL) {
        return -1;                      /* distinguish a missing symbol */
    }
    *out = fn;
    return 0;
}
```

## See Also

- [c-ptr-fn-pointer-cast](ptr-fn-pointer-cast.md) - calling through the exact function type
- [c-ptr-null-check](ptr-null-check.md) - checking before the call

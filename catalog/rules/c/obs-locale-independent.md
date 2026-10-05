---
id: c-obs-locale-independent
lang: c
prefix: obs
title: Emit machine-readable output in the C locale
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [locale, LC_NUMERIC, decimal point, parsing]
  files: ["**/*.c", "**/*.h"]
  symbols: [setlocale, LC_NUMERIC]
related: [c-obs-concise-message, c-conv-printf-length]
sources:
  - title: cppreference - setlocale
    url: https://en.cppreference.com/w/c/locale/setlocale
---
> Set `LC_NUMERIC` to `"C"` before producing output that other programs parse.

## Why

Locale categories change formatting: `LC_NUMERIC` selects the decimal separator, so the same `printf` emits `3.14` or `3,14` depending on the environment. At startup the C locale is in effect, so a program must adopt the environment with `setlocale(LC_ALL, "")` before locale-dependent formatting appears. Output that is parsed by scripts, logs, or protocols breaks under a different locale, and the failure appears only on some machines. The `"C"` locale is the minimal, predictable one and is always available.

## Bad

```c
#include <locale.h>
#include <stdio.h>

int main(void) {
    setlocale(LC_ALL, "");        /* adopt the environment locale */
    printf("rate=%.2f\n", 1.5);   /* separator now follows that locale */
    return 0;
}
```

## Good

```c
#include <locale.h>
#include <stdio.h>

int main(void) {
    setlocale(LC_ALL, "");           /* adopt the environment locale */
    if (setlocale(LC_NUMERIC, "C") == NULL) {
        return 1;
    }
    printf("rate=%.2f\n", 1.5);      /* dot separator regardless of environment */
    return 0;
}
```

## See Also

- [c-obs-concise-message](obs-concise-message.md) - the rest of a parseable message
- [c-conv-printf-length](conv-printf-length.md) - formatting values with the right type

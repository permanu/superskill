---
id: c-doc-param-names
lang: c
prefix: doc
title: Name the parameters in every function declaration
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [parameter names, prototype, header, readability]
  files: ["**/*.h"]
  symbols: []
related: [c-doc-contract, c-doc-doxygen-params]
sources:
  - title: Linux kernel coding style - Function prototypes
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> Include parameter names in declarations; types alone rarely say what each argument means.

## Why

A prototype with bare types leaves the caller to guess which argument is the destination, which is the length, and which may be null. Names cost nothing at run time and make the header self-explanatory, and they keep documentation next to the parameter it describes. Kernel style asks for names in prototypes for exactly this reason.

## Bad

```c
int clamp(int, int, int);   /* parameter roles are invisible */
```

## Good

```c
int clamp(int value, int low, int high);   /* names document the roles */
```

## See Also

- [c-doc-contract](doc-contract.md) - the broader contract around these parameters
- [c-doc-doxygen-params](doc-doxygen-params.md) - structured per-parameter documentation

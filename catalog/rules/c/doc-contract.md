---
id: c-doc-contract
lang: c
prefix: doc
title: Document the contract of every public function at its declaration
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [documentation, contract, preconditions, header]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-doc-failure-returns, c-doc-doxygen-brief]
sources:
  - title: Linux kernel coding style - Commenting
    url: https://www.kernel.org/doc/html/latest/process/coding-style.html
---
> State what each public function does, what it requires, and what the caller must do with the result.

## Why

The declaration is where callers look, and the compiler enforces none of a function's real contract: which pointers may be null, whether lengths include the terminator, who frees the result. Undocumented contracts get violated, and the failure appears far from the call site. A short comment at the declaration answers the questions the type system cannot.

## Bad

```c
int read_count(const char *path);   /* what does it return on failure? */
```

## Good

```c
/* Reads the count from path.
 * Returns 0 on success and -1 on I/O or parse failure.
 * On success, *count receives the value. */
int read_count(const char *path, int *count);
```

## See Also

- [c-doc-failure-returns](doc-failure-returns.md) - spelling out the failure cases
- [c-doc-doxygen-brief](doc-doxygen-brief.md) - the structured form of the same summary

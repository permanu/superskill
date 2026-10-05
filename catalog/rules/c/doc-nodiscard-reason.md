---
id: c-doc-nodiscard-reason
lang: c
prefix: doc
title: Give nodiscard attributes a reason string
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nodiscard, attribute, return value, reason]
  files: ["**/*.h"]
  symbols: [nodiscard]
related: [c-doc-deprecated, c-err-check-return-values]
sources:
  - title: cppreference - C attribute, nodiscard
    url: https://en.cppreference.com/w/c/language/attributes/nodiscard
---
> Attach a short reason to `[[nodiscard("...")]]` so the warning explains the consequence.

## Why

A bare `nodiscard` warning says only that a value was ignored; the caller still does not know whether that means a lost error, a leak, or a wrong result. The string-literal form is included in the compiler's warning, so the message itself teaches why the result matters. One clause is enough: "check the status or data is lost".

## Bad

```c
int parse_config(const char *text, int *out);   /* result silently ignorable */
```

## Good

```c
[[nodiscard("ignoring the status loses the parse error")]]
int parse_config(const char *text, int *out);
```

## See Also

- [c-doc-deprecated](doc-deprecated.md) - the same pattern for APIs that are going away
- [c-err-check-return-values](err-check-return-values.md) - the rule this attribute enforces

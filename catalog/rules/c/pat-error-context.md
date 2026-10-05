---
id: c-pat-error-context
lang: c
prefix: pat
title: Return detailed errors through a caller-provided context struct
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [error context, diagnostics, out parameter, status]
  files: ["**/*.c", "**/*.h"]
  symbols: []
related: [c-err-out-params, c-obs-concise-message]
sources:
  - title: SEI CERT C - ERR05-C, application-independent code should provide error detection without dictating error handling
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/recommendations/error-handling-err/err05-c/
---
> Report status in the return value and let the caller pass a struct for location and detail.

## Why

CERT lists an argument passed by address as one of the ways application-independent code reports errors without deciding how they are handled. A bare status tells the caller that something failed but not where or why, so the detail is either lost or printed by the library. A context struct keeps the library from logging, keeps the caller in control of the policy, and carries enough information for a good message.

## Bad

```c
int parse(const char *text, int *value) {
    return text[0] == '=' ? -1 : 0;   /* caller learns nothing about the failure */
}
```

## Good

```c
struct parse_error {
    int line;
    int column;
    const char *message;
};

int parse(const char *text, int *value, struct parse_error *err) {
    if (text[0] == '=') {
        err->line = 1;
        err->column = 1;
        err->message = "unexpected '='";
        return -1;   /* context travels with the status */
    }
    return 0;
}
```

## See Also

- [c-err-out-params](err-out-params.md) - when these outputs may be written
- [c-obs-concise-message](obs-concise-message.md) - what the caller does with the context

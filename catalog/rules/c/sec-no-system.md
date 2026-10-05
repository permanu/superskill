---
id: c-sec-no-system
lang: c
prefix: sec
title: Do not call system(); execute programs directly
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [system, shell, command injection, exec]
  files: ["**/*.c", "**/*.h"]
  symbols: [system, popen, execl, execve]
related: [c-sec-sanitize-subsystem]
sources:
  - title: SEI CERT C - ENV33-C, do not call system()
    url: https://cmu-sei.github.io/secure-coding-standards/sei-cert-c-coding-standard/rules/environment-env/env33-c/
---
> Launch programs with the `exec` family and argument vectors; never through a command processor.

## Why

`system` and `popen` pass the string to a shell, so any metacharacter in data that reaches them becomes shell syntax and can run additional commands with the program's privileges. The `exec` family takes the program and its arguments as separate values, so data stays an argument instead of becoming code. That removes command injection by construction rather than by filtering.

## Bad

```c
#include <stdlib.h>

int run_tool(const char *arg) {
    return system(arg);   /* the shell interprets arg as a command */
}
```

## Good

```c
#include <stdlib.h>
#include <unistd.h>

int run_tool(const char *path) {
    pid_t pid = fork();
    if (pid == 0) {
        execl(path, path, (char *)NULL);   /* no shell: no metacharacter parsing */
        _exit(127);
    }
    return pid < 0 ? -1 : 0;
}
```

## See Also

- [c-sec-sanitize-subsystem](sec-sanitize-subsystem.md) - allowlisting when data must cross into a subsystem

---
id: go-ui-usage-stderr
lang: go
prefix: ui
title: Report CLI failures on stderr with a non-zero exit
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [stderr, exit code, usage, CLI]
  files: ["**/*.go"]
  symbols: [os.Exit, os.Stderr]
related: [go-ui-flag-package, go-ui-args-start-at-one]
sources:
  - title: Package os - Exit
    url: https://pkg.go.dev/os
  - title: Package flag - Usage
    url: https://pkg.go.dev/flag
---
> stdout is for output; failures belong on stderr with a failing status.

## Why

The os documentation says the conventional exit code is zero for success and non-zero for an error, and the flag package's ExitOnError handling exits 2 on a bad flag and 0 for -h or -help. Printing a failure to stdout and exiting zero hides it from scripts and pipelines. Writing the message to stderr and exiting non-zero keeps the failure detectable.

## Bad

```go
import (
    "fmt"
    "os"
)

func fail(msg string) {
    fmt.Println(msg)
    os.Exit(0)
}
```

## Good

```go
import (
    "fmt"
    "os"
)

func fail(msg string) {
    fmt.Fprintln(os.Stderr, msg)
    os.Exit(1)
}
```

## See Also

- [go-ui-flag-package](ui-flag-package.md) - the parser that already follows this convention
- [go-ui-args-start-at-one](ui-args-start-at-one.md) - validating the arguments being reported

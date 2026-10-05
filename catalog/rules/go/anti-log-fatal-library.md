---
id: go-anti-log-fatal-library
lang: go
prefix: anti
title: Never call log.Fatal from library code
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [log.Fatal, os.Exit, library, shutdown]
  files: ["**/*.go"]
  symbols: [log.Fatal]
related: [go-err-panic-programmer-error, go-obs-log-levels]
sources:
  - title: Package log - Overview
    url: https://pkg.go.dev/log
  - title: Package os - Exit
    url: https://pkg.go.dev/os
---
> Fatal ends the whole process; return the error and let main decide.

## Why

The log documentation states that the Fatal functions call os.Exit(1) after writing the log message, and the os documentation says the program terminates immediately and deferred functions are not run. A library that calls Fatal therefore takes the shutdown decision away from main, skips the caller's cleanup, and makes the failure path impossible to exercise in a test. Returning the error keeps the exit policy in the one place that owns it.

## Bad

```go
import "log"

func start(addr string) {
    log.Fatal("cannot start on ", addr)
}
```

## Good

```go
import "errors"

func start(addr string) error {
    return errors.New("cannot start on " + addr)
}
```

## See Also

- [go-err-panic-programmer-error](err-panic-programmer-error.md) - reserving process-ending actions for the right layer
- [go-obs-log-levels](obs-log-levels.md) - logging failures without deciding the process fate

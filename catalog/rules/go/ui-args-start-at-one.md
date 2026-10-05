---
id: go-ui-args-start-at-one
lang: go
prefix: ui
title: Remember that os.Args[0] is the program name
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [os.Args, program name, arguments, flag.Args]
  files: ["**/*.go"]
  symbols: [os.Args]
related: [go-ui-flag-package, go-ui-usage-stderr]
sources:
  - title: Package os - Args
    url: https://pkg.go.dev/os
  - title: Package flag - Parse
    url: https://pkg.go.dev/flag
---
> User arguments start at index 1; index 0 is the program's own name.

## Why

The os documentation says Args holds the command-line arguments starting with the program name, and the flag documentation says Parse parses from os.Args[1:]. Treating the first element as a user argument makes every tool consume its own name. After parsing, flag.Args returns the non-flag arguments with the program name already excluded.

## Bad

```go
import "os"

func first() string {
    if len(os.Args) > 0 {
        return os.Args[0]
    }
    return ""
}
```

## Good

```go
import "os"

func first() string {
    if len(os.Args) > 1 {
        return os.Args[1]
    }
    return ""
}
```

## See Also

- [go-ui-flag-package](ui-flag-package.md) - parsing flags before touching the arguments
- [go-ui-usage-stderr](ui-usage-stderr.md) - reporting a missing argument correctly

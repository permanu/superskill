---
id: go-ui-flag-package
lang: go
prefix: ui
title: Parse flags with the flag package
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [flag, parsing, CLI, os.Args]
  files: ["**/*.go"]
  symbols: [flag.Parse]
related: [go-ui-args-start-at-one, go-ui-usage-stderr]
sources:
  - title: Package flag - Overview
    url: https://pkg.go.dev/flag
  - title: Package flag - Parse
    url: https://pkg.go.dev/flag
---
> Hand-rolled scanning misses the syntax flag already defines.

## Why

The flag documentation says Parse parses the command-line flags from os.Args[1:] and must be called after all flags are defined and before they are accessed. Hand-rolled scanning misses combined forms, equals signs, and the -- terminator that flag supports. The package also prints defaults and usage from the declarations themselves.

## Bad

```go
import (
    "os"
    "strings"
)

func verbose() bool {
    for _, a := range os.Args[1:] {
        if strings.HasPrefix(a, "-v") {
            return true
        }
    }
    return false
}
```

## Good

```go
import "flag"

var verbose = flag.Bool("v", false, "verbose output")

func main() {
    flag.Parse()
    _ = *verbose
}
```

## See Also

- [go-ui-args-start-at-one](ui-args-start-at-one.md) - where parsing starts
- [go-ui-usage-stderr](ui-usage-stderr.md) - what to do when parsing or validation fails

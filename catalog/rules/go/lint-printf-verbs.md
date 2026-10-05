---
id: go-lint-printf-verbs
lang: go
prefix: lint
title: Match every printf verb to the type of its argument
severity: should
enforce: tool
tool: go vet:printf
baseline: latest
status: verified
triggers:
  keywords: [printf, format verb, vet, formatting]
  files: ["**/*.go"]
  symbols: [fmt.Sprintf, fmt.Printf]
related: [go-lint-slog-pairs, go-err-message-lowercase]
sources:
  - title: cmd/vet - printf
    url: https://pkg.go.dev/cmd/vet
---
> Let vet verify the format string; a mismatched verb prints garbage.

## Why

The vet documentation describes the printf check as verifying that calls whose arguments do not align with the format string are reported, and fmt's printing routines use the argument type to decide the default formatting. A %d applied to a string, or a missing argument, produces a %!d(string=...) marker in the output rather than a failure. Since the check runs with `go test`, a wrong verb is caught before the message ships.

## Bad

```go
import "fmt"

func label(name string) string {
    return fmt.Sprintf("%d", name)
}
```

## Good

```go
import "fmt"

func label(name string) string {
    return fmt.Sprintf("label=%s", name)
}
```

## See Also

- [go-lint-slog-pairs](lint-slog-pairs.md) - the structured-logging version of argument checking
- [go-err-message-lowercase](err-message-lowercase.md) - the style of the text around the verb

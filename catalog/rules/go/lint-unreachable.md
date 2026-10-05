---
id: go-lint-unreachable
lang: go
prefix: lint
title: Remove code that no path can reach
severity: should
enforce: tool
tool: go vet:unreachable
baseline: latest
status: verified
triggers:
  keywords: [unreachable, dead code, vet, return]
  files: ["**/*.go"]
  symbols: [return]
related: [go-lint-lostcancel, go-style-error-flow]
sources:
  - title: cmd/vet - unreachable
    url: https://pkg.go.dev/cmd/vet
  - title: Go Code Review Comments - Indent Error Flow
    url: https://go.dev/wiki/CodeReviewComments
---
> Delete statements after a terminal return; the compiler keeps them but vet reports them.

## Why

The vet documentation lists unreachable as the check for code that cannot be reached, which appears after an unconditional return or a switch whose every branch returns. Dead statements mislead readers into thinking a case is handled and can hide a copy-paste bug where the intended branch was never wired up. Removing them keeps the control flow honest.

## Bad

```go
func sign(n int) int {
    if n >= 0 {
        return 1
    }
    return -1
    return 0
}
```

## Good

```go
func sign(n int) int {
    if n >= 0 {
        return 1
    }
    return -1
}
```

## See Also

- [go-style-error-flow](style-error-flow.md) - keeping the reachable path readable
- [go-lint-lostcancel](lint-lostcancel.md) - another control-flow defect vet reports

---
id: go-api-must-constructors
lang: go
prefix: api
title: Use Must constructors for constant inputs at package initialization
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [MustCompile, panic, initialization, regexp]
  files: ["**/*.go"]
  symbols: [regexp.MustCompile]
related: [go-api-init-minimal, go-err-panic-programmer-error]
sources:
  - title: Package regexp - MustCompile
    url: https://pkg.go.dev/regexp
  - title: Go Code Review Comments - Don't Panic
    url: https://go.dev/wiki/CodeReviewComments
---
> Initialize globals from constant inputs with Must constructors instead of manual Compile-and-panic.

## Why

MustCompile exists exactly for constants: it panics at program start when the pattern is malformed, which is a programmer error no caller can handle. The package documentation says it simplifies safe initialization of global variables holding compiled regular expressions. Spreading Compile across an init with a manual panic produces the same behavior with more code and a weaker guarantee.

## Bad

```go
var re *regexp.Regexp

func init() {
    var err error
    re, err = regexp.Compile(`^\d+$`)
    if err != nil {
        panic(err)
    }
}
```

## Good

```go
var re = regexp.MustCompile(`^\d+$`)
```

## See Also

- [go-api-init-minimal](api-init-minimal.md) - the work that does not belong at initialization
- [go-err-panic-programmer-error](err-panic-programmer-error.md) - why panic is correct for this failure

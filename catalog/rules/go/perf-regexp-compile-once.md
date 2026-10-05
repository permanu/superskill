---
id: go-perf-regexp-compile-once
lang: go
prefix: perf
title: Compile constant regular expressions once at package level
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [regexp, Compile, hot path, caching]
  files: ["**/*.go"]
  symbols: [regexp.MustCompile]
related: [go-api-must-constructors, go-perf-http-client-reuse]
sources:
  - title: Package regexp - Compile
    url: https://pkg.go.dev/regexp
  - title: Package regexp - MustCompile
    url: https://pkg.go.dev/regexp
---
> Hoist constant patterns out of functions; compile parses the expression every call.

## Why

Compile parses the expression and builds a matching program, which is real work repeated on every call when the pattern is a literal inside the function. MustCompile is documented for initializing global variables holding compiled expressions, and a Regexp is safe for concurrent use by multiple goroutines except for its configuration methods. The package documentation also exposes the All-style iterators for scanning many matches without extra allocations.

## Bad

```go
func valid(s string) bool {
    re, err := regexp.Compile(`^[a-z]+$`)
    if err != nil {
        return false
    }
    return re.MatchString(s)
}
```

## Good

```go
var validRe = regexp.MustCompile(`^[a-z]+$`)

func valid(s string) bool {
    return validRe.MatchString(s)
}
```

## See Also

- [go-api-must-constructors](api-must-constructors.md) - the initialization style this relies on
- [go-perf-http-client-reuse](perf-http-client-reuse.md) - the same hoisting for HTTP clients

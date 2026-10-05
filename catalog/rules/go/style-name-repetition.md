---
id: go-style-name-repetition
lang: go
prefix: style
title: Drop context the package or type already provides from names
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [naming, repetition, package, context]
  files: ["**/*.go"]
  symbols: []
related: [go-style-getter-name, go-style-variable-scope]
sources:
  - title: Google Go Style Best Practices - Avoid repetition
    url: https://google.github.io/styleguide/go/best-practices
  - title: Google Go Style Decisions - Repetition
    url: https://google.github.io/styleguide/go/decisions
---
> Cut words the package, type, or call site already says.

## Why

Callers write the package name in front of every symbol, so widget.NewWidget is redundant where widget.New is not. The style guide lists the common repetitions: package versus exported name, variable versus type, and names that repeat their surrounding context. Shorter names read better at the call site and remove information the compiler already knows.

## Bad

```go
type Config struct{}

type ConfigLoader struct{}

func LoadConfig(c Config) error { return nil }
```

## Good

```go
type Config struct{}

type Loader struct{}

func Load(c Config) error { return nil }
```

## See Also

- [go-style-getter-name](style-getter-name.md) - the most common filler word
- [go-style-variable-scope](style-variable-scope.md) - the same economy for locals

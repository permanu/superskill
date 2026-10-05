---
id: go-api-init-minimal
lang: go
prefix: api
title: Keep init functions side-effect free and move configuration errors to main
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [init, main, configuration, startup]
  files: ["**/*.go"]
  symbols: [init]
related: [go-api-constructors-new, go-api-must-constructors]
sources:
  - title: Google Go Style Best Practices - Program initialization
    url: https://google.github.io/styleguide/go/best-practices
  - title: Effective Go - Initialization
    url: https://go.dev/doc/effective_go
---
> Leave init for constant wiring; return configuration errors from an explicit startup call.

## Why

Code in init cannot return an error and cannot be skipped by tests, so a bad environment variable turns into a panic or a silently wrong global. The style guide says program initialization errors should propagate upward to main with an actionable message. An explicit Load keeps the failure path typed, testable, and visible at the one place that can print usage and exit.

## Bad

```go
var apiURL string

func init() {
    apiURL = os.Getenv("API_URL")
    if apiURL == "" {
        panic("API_URL is required")
    }
}
```

## Good

```go
type Config struct{ APIURL string }

func Load() (Config, error) {
    url := os.Getenv("API_URL")
    if url == "" {
        return Config{}, errors.New("API_URL is required")
    }
    return Config{APIURL: url}, nil
}
```

## See Also

- [go-api-constructors-new](api-constructors-new.md) - constructors that return errors instead of panicking
- [go-api-must-constructors](api-must-constructors.md) - the constant case where init-time panic is right

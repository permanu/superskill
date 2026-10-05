---
id: go-pat-explicit-deps
lang: go
prefix: pat
title: Carry configuration on values instead of package state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [global state, configuration, package variables]
  files: ["**/*.go"]
  symbols: []
related: [go-api-options-struct, go-api-init-minimal]
sources:
  - title: Google Go Style Best Practices - Global state
    url: https://google.github.io/styleguide/go/best-practices
  - title: Go Code Review Comments - Interfaces
    url: https://go.dev/wiki/CodeReviewComments
---
> Package state shared by all clients cannot be configured per instance.

## Why

The style guide says libraries should not force their clients to use APIs that rely on global state, and advises against exporting package-level variables that control behavior for all clients. A package variable shared by every caller cannot be configured per instance and makes tests interfere with each other. Carrying the setting on the value keeps each client independent and its dependencies visible.

## Bad

```go
var timeoutSeconds = 30

func timeout() int { return timeoutSeconds }
```

## Good

```go
type Client struct {
    timeoutSeconds int
}

func (c *Client) timeout() int { return c.timeoutSeconds }
```

## See Also

- [go-api-options-struct](api-options-struct.md) - grouping the configuration itself
- [go-api-init-minimal](api-init-minimal.md) - the other place package-wide behavior creeps in

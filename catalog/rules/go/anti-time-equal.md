---
id: go-anti-time-equal
lang: go
prefix: anti
title: Compare times with Equal, not the == operator
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [time.Time, equality, monotonic clock, Location]
  files: ["**/*.go"]
  symbols: [time.Time.Equal]
related: [go-anti-time-layout, go-data-time-rfc3339]
sources:
  - title: Package time - Time
    url: https://pkg.go.dev/time
  - title: Package time - Monotonic Clocks
    url: https://pkg.go.dev/time
---
> Use Time.Equal: == also compares Location and the monotonic clock reading.

## Why

The time documentation notes that the Go == operator compares not just the time instant but also the Location and the monotonic clock reading, and concludes that t.Equal(u) should be preferred in general. Two values that denote the same instant compare unequal with == when one came from a database round-trip and the other from time.Now, or when only one carries a monotonic reading. Equal uses the most accurate comparison available and handles the case where only one argument has a monotonic reading.

## Bad

```go
import "time"

func sameInstant(a, b time.Time) bool {
    return a == b
}
```

## Good

```go
import "time"

func sameInstant(a, b time.Time) bool {
    return a.Equal(b)
}
```

## See Also

- [go-anti-time-layout](anti-time-layout.md) - the other time API that trips up cross-language habits
- [go-data-time-rfc3339](data-time-rfc3339.md) - keeping one canonical wire format for times

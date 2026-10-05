---
id: go-num-duration
lang: go
prefix: num
title: Multiply raw numbers into time.Duration with a unit constant
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [time.Duration, nanoseconds, units, conversion]
  files: ["**/*.go"]
  symbols: [time.Duration, time.Second]
related: [go-num-div-zero, go-data-time-rfc3339]
sources:
  - title: Package time - Duration
    url: https://pkg.go.dev/time
  - title: Package time - Duration constants
    url: https://pkg.go.dev/time
---
> Duration counts nanoseconds; a bare conversion turns 5 into 5ns.

## Why

The time documentation says a Duration represents the elapsed time between two instants as an int64 nanosecond count. A bare conversion of a value that means seconds therefore produces nanoseconds, so five becomes five nanoseconds instead of five seconds. Multiplying by the unit constant keeps the number's unit visible at the conversion and matches the constants the package documents, from Nanosecond through Hour.

## Bad

```go
import "time"

func timeout(seconds int) time.Duration {
    return time.Duration(seconds)
}
```

## Good

```go
import "time"

func timeout(seconds int) time.Duration {
    return time.Duration(seconds) * time.Second
}
```

## See Also

- [go-num-div-zero](num-div-zero.md) - another arithmetic trap that surfaces at run time
- [go-data-time-rfc3339](data-time-rfc3339.md) - keeping times consistent on the wire

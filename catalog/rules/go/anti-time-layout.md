---
id: go-anti-time-layout
lang: go
prefix: anti
title: Write time layouts as the reference time, not strftime patterns
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [time.Format, layout, strftime, reference time]
  files: ["**/*.go"]
  symbols: [time.Time.Format]
related: [go-anti-time-equal, go-data-time-rfc3339]
sources:
  - title: Package time - Layout
    url: https://pkg.go.dev/time
  - title: Package time - Time.Format
    url: https://pkg.go.dev/time
---
> Layouts are the reference time formatted your way; %Y is copied literally.

## Why

The time documentation defines layouts against the specific reference time stamp January 2, 15:04:05, 2006, in time zone seven hours west of GMT, recorded as the constant Layout. A layout string must be written as that reference time arranged the way the output should look, so "2006-01-02" produces an ISO date. A strftime pattern such as "%Y-%m-%d" contains no layout elements, so Format copies the percent signs and letters into the output unchanged.

## Bad

```go
import "time"

func formatDate(t time.Time) string {
    return t.Format("%Y-%m-%d")
}
```

## Good

```go
import "time"

func formatDate(t time.Time) string {
    return t.Format("2006-01-02")
}
```

## See Also

- [go-anti-time-equal](anti-time-equal.md) - the equality counterpart of the same API
- [go-data-time-rfc3339](data-time-rfc3339.md) - using predefined formats instead of custom layouts

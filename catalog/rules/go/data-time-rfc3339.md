---
id: go-data-time-rfc3339
lang: go
prefix: data
title: Keep time.Time on the wire instead of formatting it by hand
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [time, RFC 3339, MarshalJSON, layout]
  files: ["**/*.go"]
  symbols: [time.Time]
related: [go-data-json-tags-explicit, go-data-json-null-vs-absent]
sources:
  - title: Package time - Time.MarshalJSON
    url: https://pkg.go.dev/time
  - title: Package time - Time.Format
    url: https://pkg.go.dev/time
---
> Let time.Time marshal itself; a hand-picked layout drops zone and precision.

## Why

The time documentation says MarshalJSON writes a quoted string in RFC 3339 format with sub-second precision, and the format constants define that reference layout. Replacing the field with a formatted string picks one layout and silently drops the time zone offset and fractional seconds, so values no longer round-trip through Parse. Keeping time.Time in the struct keeps one canonical wire format and lets the zero value and errors behave predictably.

## Bad

```go
import "time"

type Event struct {
    At string `json:"at"`
}

func newEvent(t time.Time) Event {
    return Event{At: t.Format("2006-01-02 15:04:05")}
}
```

## Good

```go
import "time"

type Event struct {
    At time.Time `json:"at"`
}

func newEvent(t time.Time) Event {
    return Event{At: t}
}
```

## See Also

- [go-data-json-tags-explicit](data-json-tags-explicit.md) - naming the field on the wire
- [go-data-json-null-vs-absent](data-json-null-vs-absent.md) - the pointer pattern for optional times

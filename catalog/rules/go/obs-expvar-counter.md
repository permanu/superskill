---
id: go-obs-expvar-counter
lang: go
prefix: obs
title: Expose service counters with expvar
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [expvar, metrics, counter, debug/vars]
  files: ["**/*.go"]
  symbols: [expvar.NewInt, expvar.Map]
related: [go-obs-pprof-explicit, go-obs-slog-structured]
sources:
  - title: Package expvar
    url: https://pkg.go.dev/expvar
  - title: Diagnostics - Runtime statistics and events
    url: https://go.dev/doc/diagnostics
---
> Track operational counts in expvar so they are observable without custom plumbing.

## Why

The expvar documentation describes a standardized interface to public variables such as operation counters, exposed at /debug/vars in JSON with atomic updates. A bare int64 behind atomic operations is invisible outside the process, so operators cannot confirm the rate of requests, errors, or retries. expvar also publishes cmdline and memstats, which makes it a single endpoint for the service's vital signs.

## Bad

```go
var requests int64

func handle() {
    atomic.AddInt64(&requests, 1)
}
```

## Good

```go
var requests = expvar.NewInt("requests")

func handle() {
    requests.Add(1)
}
```

## See Also

- [go-obs-pprof-explicit](obs-pprof-explicit.md) - the other debug endpoint worth mounting
- [go-obs-slog-structured](obs-slog-structured.md) - events belong in logs, rates in counters

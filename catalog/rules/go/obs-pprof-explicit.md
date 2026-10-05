---
id: go-obs-pprof-explicit
lang: go
prefix: obs
title: Register pprof handlers explicitly instead of blank-importing them
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pprof, handlers, ServeMux, debug endpoint]
  files: ["**/*.go"]
  symbols: [pprof.Index, pprof.Profile, pprof.Trace]
related: [go-obs-expvar-counter, go-perf-cpu-profile]
sources:
  - title: Package net/http/pprof
    url: https://pkg.go.dev/net/http/pprof
  - title: Diagnostics - Can I serve the profiler handlers on a different path and port?
    url: https://go.dev/doc/diagnostics
---
> Mount pprof on a dedicated mux with the exported handlers.

## Why

The net/http/pprof documentation says the package is typically imported for the side effect of registering handlers on the default mux, and that when you are not using DefaultServeMux you must register the handlers with the mux you use. The diagnostics guide shows exactly that alternative, serving pprof.Profile under a custom path on a chosen port. An explicit admin mux keeps the debug surface off the public server and makes the exposure a visible decision.

## Bad

```go
import (
    "net/http"
    _ "net/http/pprof"
)

func serve() error {
    return http.ListenAndServe(":8080", nil)
}
```

## Good

```go
import (
    "net/http"
    "net/http/pprof"
)

func adminMux() *http.ServeMux {
    mux := http.NewServeMux()
    mux.HandleFunc("/debug/pprof/", pprof.Index)
    mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
    mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
    return mux
}
```

## See Also

- [go-obs-expvar-counter](obs-expvar-counter.md) - the other diagnostics endpoint
- [go-perf-cpu-profile](perf-cpu-profile.md) - collecting the CPU profile this exposes

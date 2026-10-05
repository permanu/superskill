---
id: go-doc-concurrency-note
lang: go
prefix: doc
title: State when a type is safe for concurrent use
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, concurrency, goroutine safety, mutex]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-field-comments, go-conc-mutex-map]
sources:
  - title: Go Doc Comments - Types
    url: https://go.dev/doc/comment
  - title: Go Doc Comments - Funcs
    url: https://go.dev/doc/comment
---
> By default a type is single-goroutine; say so when it is stronger.

## Why

The guide says programmers should expect by default that a type is safe for use only by a single goroutine at a time, and that a type providing stronger guarantees should state them in its doc comment. Top-level functions are assumed safe to call concurrently, but methods are not, so a mutex-guarded type that stays silent leaves callers guessing. One sentence above the type records the guarantee where readers look for it.

## Bad

```go
import "sync"

type Cache struct {
    mu sync.Mutex
    m  map[string]string
}
```

## Good

```go
import "sync"

// A Cache is safe for concurrent use by multiple goroutines.
type Cache struct {
    mu sync.Mutex
    m  map[string]string
}
```

## See Also

- [go-doc-field-comments](doc-field-comments.md) - documenting the rest of a type's contract
- [go-conc-mutex-map](conc-mutex-map.md) - guarding the map the comment promises about

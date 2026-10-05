---
id: go-mem-map-clear
lang: go
prefix: mem
title: Empty maps with the clear builtin, not a delete loop
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, clear, delete, reset]
  files: ["**/*.go"]
  symbols: [clear]
related: [go-mem-maps-clone, go-conc-mutex-map]
sources:
  - title: Package builtin - clear
    url: https://pkg.go.dev/builtin
  - title: Go Release Notes
    url: https://go.dev/doc/go1.27
---
> Reset a map with clear(m) instead of ranging over it to delete.

## Why

The builtin documentation defines clear as deleting all entries and leaving an empty map, with nil as a no-op. The delete loop says the same thing in more code and leaves a second obvious question: whether the map variable was reassigned or the storage reused. One call states the intent, and it also works on slices.

## Bad

```go
func reset(m map[string]int) {
    for k := range m {
        delete(m, k)
    }
}
```

## Good

```go
func reset(m map[string]int) {
    clear(m)
}
```

## See Also

- [go-mem-maps-clone](mem-maps-clone.md) - copying versus clearing
- [go-conc-mutex-map](conc-mutex-map.md) - clearing under concurrency needs the lock

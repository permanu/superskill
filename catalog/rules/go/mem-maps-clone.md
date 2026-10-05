---
id: go-mem-maps-clone
lang: go
prefix: mem
title: Clone a map before exposing it to a caller
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, clone, aliasing, ownership]
  files: ["**/*.go"]
  symbols: [maps.Clone]
related: [go-mem-slices-clone, go-conc-mutex-map]
sources:
  - title: Package maps - Clone
    url: https://pkg.go.dev/maps
  - title: Go FAQ - Why are maps, slices, and channels references?
    url: https://go.dev/doc/faq
---
> Hand out a copy of internal maps so callers cannot mutate your state.

## Why

Maps are references, so returning the field itself lets any caller insert or delete entries in the owner's data. The FAQ explains that maps act as references to shared storage, which is why copying one is never implicit. maps.Clone makes a shallow copy in one call, and the owner keeps the only writable reference.

## Bad

```go
type Registry struct{ m map[string]int }

func (r *Registry) Entries() map[string]int { return r.m }
```

## Good

```go
type Registry struct{ m map[string]int }

func (r *Registry) Entries() map[string]int { return maps.Clone(r.m) }
```

## See Also

- [go-mem-slices-clone](mem-slices-clone.md) - the same ownership rule for slices
- [go-conc-mutex-map](conc-mutex-map.md) - synchronization is still required for concurrent access

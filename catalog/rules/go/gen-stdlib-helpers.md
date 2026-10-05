---
id: go-gen-stdlib-helpers
lang: go
prefix: gen
title: Use the slices and maps helpers before writing generic loops
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [slices, maps, Contains, Index, stdlib]
  files: ["**/*.go"]
  symbols: [slices.Contains, slices.Index]
related: [go-gen-write-code-first, go-mem-slices-sort]
sources:
  - title: Package slices
    url: https://pkg.go.dev/slices
  - title: Package maps
    url: https://pkg.go.dev/maps
---
> Reach for slices.Contains, Index, Clone, and Sort instead of hand-written loops.

## Why

The slices package defines functions useful with slices of any type, covering search, cloning, sorting, comparison, and deletion; maps offers the same for keys, values, and equality. A hand-written membership loop is a small generic algorithm that already exists, tested and documented. Using the helpers also standardizes edge behavior such as NaN comparison and nilness preservation.

## Bad

```go
func hasAdmin(roles []string) bool {
    for _, r := range roles {
        if r == "admin" {
            return true
        }
    }
    return false
}
```

## Good

```go
import "slices"

func hasAdmin(roles []string) bool {
    return slices.Contains(roles, "admin")
}
```

## See Also

- [go-gen-write-code-first](gen-write-code-first.md) - avoiding new generic code that already exists
- [go-mem-slices-sort](mem-slices-sort.md) - the sorting helper in the same family

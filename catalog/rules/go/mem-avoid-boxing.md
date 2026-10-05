---
id: go-mem-avoid-boxing
lang: go
prefix: mem
title: Keep hot values out of any when a concrete or generic type fits
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [any, interface, boxing, allocation, generics]
  files: ["**/*.go"]
  symbols: [any]
related: [go-iface-interface-over-typeparam, go-mem-sync-pool]
sources:
  - title: When To Use Generics
    url: https://go.dev/blog/when-generics
  - title: Go FAQ - When are function parameters passed by value?
    url: https://go.dev/doc/faq
---
> Prefer []int over []any and generic functions over interface parameters for hot data.

## Why

Storing a value in an interface boxes it, and reading it back requires a type assertion the compiler cannot check away. The generics guide says replacing an interface type with a type parameter can store data more efficiently and avoid type assertions, while keeping full build-time checking. The FAQ's discussion of interface representation explains why a copied value may also be heap-allocated.

## Bad

```go
func sum(vals []any) int {
    total := 0
    for _, v := range vals {
        total += v.(int)
    }
    return total
}
```

## Good

```go
func sum(vals []int) int {
    total := 0
    for _, v := range vals {
        total += v
    }
    return total
}
```

## See Also

- [go-iface-interface-over-typeparam](iface-interface-over-typeparam.md) - choosing interfaces over type parameters
- [go-mem-sync-pool](mem-sync-pool.md) - the other way to cut per-call allocation

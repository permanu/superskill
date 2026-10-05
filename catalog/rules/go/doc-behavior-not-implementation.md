---
id: go-doc-behavior-not-implementation
lang: go
prefix: doc
title: Document what a function does, not how it is implemented
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [doc comment, implementation details, algorithm, contract]
  files: ["**/*.go"]
  symbols: []
related: [go-doc-reports-whether, go-doc-field-comments]
sources:
  - title: Go Doc Comments - Funcs
    url: https://go.dev/doc/comment
---
> Describe the contract callers depend on; leave the algorithm to the body.

## Why

The guide says doc comments should not explain internal details such as the algorithm used in the current implementation, and that those are best left to comments inside the function body. It makes an exception for asymptotic time or space bounds when that detail matters to callers. A comment that names the current algorithm turns every future rewrite into a documentation bug.

## Bad

```go
// SortOrders sorts orders by comparing adjacent elements and swapping
// them until no swaps are needed.
func SortOrders(orders []string) []string {
    return orders
}
```

## Good

```go
// SortOrders returns orders sorted oldest first.
func SortOrders(orders []string) []string {
    return orders
}
```

## See Also

- [go-doc-reports-whether](doc-reports-whether.md) - the phrasing convention for boolean results
- [go-doc-field-comments](doc-field-comments.md) - the same contract-first idea for struct fields

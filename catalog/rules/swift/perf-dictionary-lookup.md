---
id: swift-perf-dictionary-lookup
lang: swift
prefix: perf
title: Look up keyed values in a Dictionary instead of scanning
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [dictionary, lookup, performance]
  files: ["**/*.swift"]
related: [swift-perf-set-membership, swift-perf-first-where]
sources:
  - title: Dictionary
    url: https://developer.apple.com/documentation/swift/dictionary
---
> Look up keyed values in a Dictionary instead of scanning an array.

## Why

Apple documents Dictionary as a hash table providing fast access to the entries it contains, with each entry identified by its hashable key. A scan with `first(where:)` walks the array for every lookup, so resolving identifiers one by one against a list turns into quadratic work; building the dictionary once and subscripting it performs one hash lookup per key.

## Bad

```swift
struct User {
    let id: Int
    let name: String
}

let users = [User(id: 1, name: "Ada"), User(id: 2, name: "Grace")]
let ids = [1, 2]
let names = ids.map { id in users.first(where: { $0.id == id })?.name ?? "missing" }
print(names)
```

## Good

```swift
struct User {
    let id: Int
    let name: String
}

let users = [User(id: 1, name: "Ada"), User(id: 2, name: "Grace")]
let usersByID = Dictionary(uniqueKeysWithValues: users.map { ($0.id, $0) })
let ids = [1, 2]
let names = ids.map { id in usersByID[id]?.name ?? "missing" }
print(names)
```

## See Also

- [swift-perf-set-membership](perf-set-membership.md) - the same choice for membership
- [swift-perf-first-where](perf-first-where.md) - single scans that are appropriate

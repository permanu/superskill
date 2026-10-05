---
id: swift-api-side-effect-naming
lang: swift
prefix: api
title: Name mutating operations with imperative verbs and their nonmutating twins with participles
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [mutating, naming, side effects, verb]
  files: ["**/*.swift"]
  symbols: [mutating]
related: [swift-api-boolean-assertions, swift-type-inout-mutation]
sources:
  - title: Swift API Design Guidelines
    url: https://www.swift.org/documentation/api-design-guidelines/
---
> Use the imperative for a mutating method and the ed or ing form for its nonmutating counterpart.

## Why

The API Design Guidelines require functions to be named by their side effects: mutating operations read as imperative verb phrases, while their nonmutating variants use the past or present participle. Swapping the two conventions makes a call that changes the receiver look like a query and a call that returns a new value look like a mutation. The pairing `sort()` and `sorted()` is the pattern callers already expect.

## Bad

```swift
struct Deck {
    private var cards: [Int] = []

    func shuffle() -> Deck {
        var copy = self
        copy.cards.reverse()
        return copy
    }

    mutating func shuffled() {
        cards.reverse()
    }
}
```

## Good

```swift
struct Deck {
    private var cards: [Int] = []

    mutating func shuffle() {
        cards.reverse()
    }

    func shuffled() -> Deck {
        var copy = self
        copy.cards.reverse()
        return copy
    }
}
```

## See Also

- [swift-api-boolean-assertions](api-boolean-assertions.md) - the same rule for Boolean queries
- [swift-type-inout-mutation](type-inout-mutation.md) - returning values instead of mutating through parameters

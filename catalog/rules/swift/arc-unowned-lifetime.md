---
id: swift-arc-unowned-lifetime
lang: swift
prefix: arc
title: Use unowned only when the referenced instance is guaranteed to outlive the reference
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [unowned, lifetime, weak, dangling]
  files: ["**/*.swift"]
  symbols: [unowned, weak]
related: [swift-arc-weak-cycle, swift-arc-weak-consumption]
sources:
  - title: The Swift Programming Language - Automatic Reference Counting
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/
---
> Reserve unowned for references whose target provably outlives them; use weak when lifetime is uncertain.

## Why

The Swift book defines unowned references for the case where the other instance has the same lifetime or a longer one, and warns that accessing an unowned reference after its target deallocates is a runtime error. A factory that creates the target locally and returns only the holder violates that contract: the target deallocates and the unowned reference dangles. A weak reference expresses the uncertain case and zeroes out instead of trapping.

## Bad

```swift
final class Customer {
    let name: String
    var card: CreditCard?

    init(name: String) {
        self.name = name
    }
}

final class CreditCard {
    unowned let customer: Customer

    init(customer: Customer) {
        self.customer = customer
    }
}

func makeCard() -> CreditCard {
    let customer = Customer(name: "Ada")
    let card = CreditCard(customer: customer)
    customer.card = card
    return card
}
```

## Good

```swift
final class Customer {
    let name: String
    var card: CreditCard?

    init(name: String) {
        self.name = name
    }
}

final class CreditCard {
    weak var customer: Customer?

    init(customer: Customer) {
        self.customer = customer
    }
}

func makeCard() -> CreditCard {
    let customer = Customer(name: "Ada")
    let card = CreditCard(customer: customer)
    customer.card = card
    return card
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - choosing which side of a relationship is weak
- [swift-arc-weak-consumption](arc-weak-consumption.md) - handling the optional that weak produces

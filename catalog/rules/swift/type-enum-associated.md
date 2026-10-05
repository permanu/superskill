---
id: swift-type-enum-associated
lang: swift
prefix: type
title: Attach per-case data with associated values instead of parallel optionals
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [associated values, enum, optionals, variant]
  files: ["**/*.swift"]
  symbols: [enum, case]
related: [swift-type-enum-state, swift-err-error-enum-model]
sources:
  - title: The Swift Programming Language - Enumerations
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/
---
> Carry each variant's data in its enum case so only the matching fields can be set.

## Why

The Swift book describes enumerations with associated values as discriminated unions: each case stores exactly the values that apply to it, and the types can differ per case. Parallel optional properties permit impossible combinations, such as a payment that is both a card and a bank account, and every consumer must guess which fields belong together. Case payloads make the shape of each variant explicit and let switches bind them directly.

## Bad

```swift
struct Payment {
    var cardLast4: String?
    var bankAccount: String?
    var paypalEmail: String?

    func describe() -> String {
        if let last4 = cardLast4 { return "card \(last4)" }
        if let iban = bankAccount { return "bank \(iban)" }
        if let email = paypalEmail { return "paypal \(email)" }
        return "unset"
    }
}
```

## Good

```swift
enum Payment {
    case card(last4: String)
    case bankAccount(iban: String)
    case paypal(email: String)

    func describe() -> String {
        switch self {
        case .card(let last4): "card \(last4)"
        case .bankAccount(let iban): "bank \(iban)"
        case .paypal(let email): "paypal \(email)"
        }
    }
}
```

## See Also

- [swift-type-enum-state](type-enum-state.md) - enums for states without payloads
- [swift-err-error-enum-model](err-error-enum-model.md) - the same modeling choice for failures

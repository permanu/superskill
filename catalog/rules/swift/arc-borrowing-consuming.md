---
id: swift-arc-borrowing-consuming
lang: swift
prefix: arc
title: Mark methods that mutate and return their receiver as consuming
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [consuming, borrowing, ownership modifiers, in-place]
  files: ["**/*.swift"]
  symbols: [consuming, borrowing]
related: [swift-arc-consume-operator, swift-arc-noncopyable]
sources:
  - title: Swift Evolution SE-0377 - borrowing and consuming parameter ownership modifiers
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0377-parameter-ownership-modifiers.md
---
> Declare `consuming` on methods that take ownership of their receiver and return it modified.

## Why

SE-0377 introduces `borrowing` and `consuming` so a declaration can state which ownership convention it uses instead of relying on the compiler's default. A method like an appending `plus` that mutates its receiver and returns it can take ownership, mutate the unique value in place, and hand it back, which the proposal presents as turning a quadratic append chain into amortized linear work. Without the modifier the receiver is borrowed and the mutation starts from a copy.

## Bad

```swift
extension String {
    func plus(_ other: String) -> String {
        var result = self
        result += other
        return result
    }
}
```

## Good

```swift
extension String {
    consuming func plus(_ other: String) -> String {
        self += other
        return self
    }
}
```

## See Also

- [swift-arc-consume-operator](arc-consume-operator.md) - the caller-side transfer operator
- [swift-arc-noncopyable](arc-noncopyable.md) - where ownership conventions become mandatory

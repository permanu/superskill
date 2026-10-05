---
id: swift-arc-consume-operator
lang: swift
prefix: arc
title: Forward ownership at the last use with the consume operator
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [consume, ownership, copy, last use]
  files: ["**/*.swift"]
  symbols: [consume, consuming]
related: [swift-arc-borrowing-consuming, swift-type-value-copy]
sources:
  - title: Swift Evolution SE-0366 - consume operator to end the lifetime of a variable binding
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0366-move-function.md
  - title: Swift Evolution SE-0377 - borrowing and consuming parameter ownership modifiers
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0377-parameter-ownership-modifiers.md
---
> Write `consume x` at the last use of a binding to transfer ownership instead of copying.

## Why

SE-0366 introduces `consume` to end a binding's lifetime at a specific point and forward ownership to the callee, guaranteeing that no retain or copy-on-write copy is needed for the transfer. Without it, the caller keeps its reference alive to the end of scope and the callee may have to copy shared storage. The operator also makes the transfer explicit: any later use of the binding becomes a compile-time error.

## Bad

```swift
func process() {
    let image: [UInt8] = [1, 2, 3]
    let rendered = render(image)
    print(rendered)
}

func render(_ image: [UInt8]) -> [UInt8] {
    var buffer = image
    buffer.append(0)
    return buffer
}
```

## Good

```swift
func process() {
    let image: [UInt8] = [1, 2, 3]
    let rendered = render(consume image)
    print(rendered)
}

func render(_ image: consuming [UInt8]) -> [UInt8] {
    var buffer = consume image
    buffer.append(0)
    return buffer
}
```

## See Also

- [swift-arc-borrowing-consuming](arc-borrowing-consuming.md) - the declaration-side modifiers
- [swift-type-value-copy](type-value-copy.md) - what a value copy actually duplicates

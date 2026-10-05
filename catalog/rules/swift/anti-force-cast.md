---
id: swift-anti-force-cast
lang: swift
prefix: anti
title: Do not force casts with as
severity: must
enforce: tool
tool: swiftlint:force_cast
baseline: latest
status: verified
triggers:
  keywords: [force cast, as, downcast]
  files: ["**/*.swift"]
  symbols: [as]
related: [swift-anti-identical-operands, swift-err-no-force-try]
sources:
  - title: SwiftLint - force_cast
    url: https://realm.github.io/SwiftLint/force_cast.html
---
> Do not force casts with `as!`; test the cast and handle the failure.

## Why

SwiftLint's `force_cast` rule states that force casts should be avoided, and it is enabled by default with error severity. A force cast tells the compiler to assume the runtime type; when the value is something else the process traps with no context about which cast failed. A conditional cast makes the assumption explicit and leaves a branch where the mismatch can be handled or reported.

## Bad

```swift
let value: Any = 42
let number = value as! Int
print(number)
```

## Good

```swift
let value: Any = 42
if let number = value as? Int {
    print(number)
}
```

## See Also

- [swift-anti-identical-operands](anti-identical-operands.md) - another comparison that silently misbehaves
- [swift-err-no-force-try](err-no-force-try.md) - the same reasoning for `try!`

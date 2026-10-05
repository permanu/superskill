---
id: swift-style-trailing-closure
lang: swift
prefix: style
title: Write a multi-line final closure as a trailing closure
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [trailing closure, closure, call site]
  files: ["**/*.swift"]
  symbols: [map]
related: [swift-style-implicit-return, swift-arc-closure-capture]
sources:
  - title: The Swift Programming Language - Closures
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/
---
> Write a multi-line final closure as a trailing closure.

## Why

The Closures chapter documents trailing closure syntax for passing a closure to a function as its final argument, and states that trailing closures are most useful when the closure is long enough that it cannot be written inline on a single line. When the closure is the only argument, the call needs no parentheses after the function name, so the body sits directly under the call that uses it instead of being wrapped in the argument list.

## Bad

```swift
let numbers = [16, 58, 510]

let strings = numbers.map({ (number) -> String in
    var value = number
    var output = ""
    repeat {
        output = String(value % 10) + output
        value /= 10
    } while value > 0
    return output
})
```

## Good

```swift
let numbers = [16, 58, 510]

let strings = numbers.map { (number) -> String in
    var value = number
    var output = ""
    repeat {
        output = String(value % 10) + output
        value /= 10
    } while value > 0
    return output
}
```

## See Also

- [swift-style-implicit-return](style-implicit-return.md) - dropping return from the closure body
- [swift-arc-closure-capture](arc-closure-capture.md) - capturing self in escaping closures

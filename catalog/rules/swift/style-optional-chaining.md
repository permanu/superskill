---
id: swift-style-optional-chaining
lang: swift
prefix: style
title: Reach through optional values with optional chaining
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional chaining, force unwrap, optionals]
  files: ["**/*.swift"]
related: [swift-style-nil-coalescing, swift-style-optional-shorthand]
sources:
  - title: The Swift Programming Language - Optional Chaining
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/
---
> Reach through optional values with optional chaining instead of force unwrapping.

## Why

The Optional Chaining chapter presents chaining as the alternative to forced unwrapping: a chained call fails gracefully when a link is `nil`, while `!` triggers a runtime error. The chapter also notes that chaining can link multiple levels and that the whole chain fails if any link is `nil`, so nested optionals collapse to a single check at the call site.

## Bad

```swift
class Person {
    var residence: Residence?
}

class Residence {
    var numberOfRooms = 1
}

let john = Person()
let roomCount = john.residence!.numberOfRooms
print(roomCount)
```

## Good

```swift
class Person {
    var residence: Residence?
}

class Residence {
    var numberOfRooms = 1
}

let john = Person()
if let roomCount = john.residence?.numberOfRooms {
    print("John's residence has \(roomCount) room(s).")
}
```

## See Also

- [swift-style-nil-coalescing](style-nil-coalescing.md) - supplying a default when the chain fails
- [swift-style-optional-shorthand](style-optional-shorthand.md) - the binding shorthand for the unwrapped value

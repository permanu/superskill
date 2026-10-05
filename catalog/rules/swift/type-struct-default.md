---
id: swift-type-struct-default
lang: swift
prefix: type
title: Model data with structs and reserve classes for identity, inheritance, or shared lifetime
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [struct, class, value type, modeling]
  files: ["**/*.swift"]
  symbols: [struct, class]
related: [swift-type-value-copy, swift-type-final-class]
sources:
  - title: The Swift Programming Language - Structures and Classes
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/
---
> Default to a struct for data models; choose a class only for reference identity or inheritance.

## Why

The Swift book states the general guideline to prefer structures because they are easier to reason about, with classes for the cases that need their extra capabilities: inheritance, type casting, deinitializers, and reference counting. A class used as a plain data bag silently shares state between every holder, so a mutation in one place is visible everywhere. A struct keeps each holder's value independent and makes the sharing explicit when it is actually needed.

## Bad

```swift
class Point {
    var x = 0
    var y = 0
}

var a = Point()
let b = a
a.x = 10
print(b.x)
```

## Good

```swift
struct Point {
    var x = 0
    var y = 0
}

var a = Point()
let b = a
a.x = 10
print(b.x)
```

## See Also

- [swift-type-value-copy](type-value-copy.md) - what copies do and do not isolate
- [swift-type-final-class](type-final-class.md) - closing a class once it is justified

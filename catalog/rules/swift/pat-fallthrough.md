---
id: swift-pat-fallthrough
lang: swift
prefix: pat
title: Do not use fallthrough to share a case body
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [fallthrough, switch, cases]
  files: ["**/*.swift"]
related: [swift-pat-if-case, swift-style-switch-no-default]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Do not use `fallthrough` to share a case body.

## Why

The Control Flow chapter states that the `fallthrough` keyword does not check the case conditions for the switch case that it causes execution to fall into: the body runs unconditionally once reached. Sharing a body through `fallthrough` therefore executes the next case's body for values it does not match, and inserting a new case between the two changes behavior silently. A compound case with comma-separated patterns runs one body for every pattern that matches and keeps the match conditions in force.

## Bad

```swift
let code = 1
switch code {
case 1:
    print("one")
    fallthrough
case 2:
    print("two")
default:
    break
}
```

## Good

```swift
let code = 1
switch code {
case 1, 2:
    print("one or two")
default:
    break
}
```

## See Also

- [swift-pat-if-case](pat-if-case.md) - matching a single pattern without a switch
- [swift-style-switch-no-default](style-switch-no-default.md) - keeping switches exhaustive

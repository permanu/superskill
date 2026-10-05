---
id: swift-pat-labeled-loop
lang: swift
prefix: pat
title: Label nested loops instead of tracking a flag
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [labeled statements, break, nested loops]
  files: ["**/*.swift"]
related: [swift-style-guard-early-exit, swift-pat-if-case]
sources:
  - title: The Swift Programming Language - Control Flow
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/
---
> Label a nested loop instead of tracking an exit flag.

## Why

The Control Flow chapter documents labeled statements: a label before a loop or switch that `break` or `continue` can name to control that specific statement rather than the innermost one. A flag variable reimplements that exit condition at every nesting level, so each loop has to check it and the flag's lifecycle becomes another thing to get right. The label names the loop to leave and the exit happens at the point of the match.

## Bad

```swift
let rows = [[1, 2], [3, 4]]
var found = false
for row in rows {
    for value in row {
        if value == 3 {
            found = true
            break
        }
    }
    if found { break }
}
print(found)
```

## Good

```swift
let rows = [[1, 2], [3, 4]]
outer: for row in rows {
    for value in row {
        if value == 3 {
            break outer
        }
    }
}
```

## See Also

- [swift-style-guard-early-exit](style-guard-early-exit.md) - exiting a function early instead
- [swift-pat-if-case](pat-if-case.md) - matching a pattern without a switch

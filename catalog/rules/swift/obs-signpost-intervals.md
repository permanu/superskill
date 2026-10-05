---
id: swift-obs-signpost-intervals
lang: swift
prefix: obs
title: Measure task durations with OSSignposter intervals
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signpost, interval, instruments, duration]
  files: ["**/*.swift"]
  symbols: [OSSignposter, withIntervalSignpost]
related: [swift-obs-signpost-events, swift-obs-signpost-animations]
sources:
  - title: OSSignposter
    url: https://developer.apple.com/documentation/os/ossignposter
---
> Record durations with signposted intervals instead of ad hoc timestamps and prints.

## Why

Apple's OSSignposter documentation describes creating intervals with a begin call, retaining the returned state, and ending with the matching end call, so Instruments' `os_signposts` instrument can record them and display the data on a timeline. It also provides a closure form that wraps a scope. Printed timestamps leave no structured timeline and cannot be correlated with the rest of the trace. The signposted interval uses the same subsystem and category as logging and appears visually in Instruments.

## Bad

```swift
import Foundation

func importData() {
    let start = Date()
    performImport()
    print("import took \(Date().timeIntervalSince(start))s")
}

func performImport() {}
```

## Good

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "import")

func importData() {
    let id = signposter.makeSignpostID()
    signposter.withIntervalSignpost("Import", id: id) {
        performImport()
    }
}

func performImport() {}
```

## See Also

- [swift-obs-signpost-events](obs-signpost-events.md) - point-in-time markers without a duration
- [swift-obs-signpost-animations](obs-signpost-animations.md) - the animation-specific interval API

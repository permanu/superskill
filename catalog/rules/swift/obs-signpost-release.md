---
id: swift-obs-signpost-release
lang: swift
prefix: obs
title: Control signpost emission at runtime instead of compiling it out
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signpost, release build, isenabled, debug]
  files: ["**/*.swift"]
  symbols: [OSSignposter, isEnabled, disabled]
related: [swift-obs-signpost-events, swift-obs-signpost-intervals]
sources:
  - title: OSSignposter
    url: https://developer.apple.com/documentation/os/ossignposter
---
> Gate signposts with `isEnabled` rather than wrapping them in a debug-only compilation condition.

## Why

Apple's OSSignposter documentation provides an `isEnabled` property and a shared `disabled` signposter as the way to control whether signposts are emitted at runtime. Instrumentation that is compiled out with `#if DEBUG` cannot observe a release build, which is where field hangs and hitches happen. Checking the runtime switch keeps the signposts in shipping code while letting a build or environment turn them off.

## Bad

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "cache")

func cacheHit() {
    #if DEBUG
    let id = signposter.makeSignpostID()
    signposter.emitEvent("CacheHit", id: id)
    #endif
}
```

## Good

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "cache")

func cacheHit() {
    if signposter.isEnabled {
        let id = signposter.makeSignpostID()
        signposter.emitEvent("CacheHit", id: id)
    }
}
```

## See Also

- [swift-obs-signpost-events](obs-signpost-events.md) - the events being gated here
- [swift-obs-signpost-intervals](obs-signpost-intervals.md) - the duration form of the same instrumentation

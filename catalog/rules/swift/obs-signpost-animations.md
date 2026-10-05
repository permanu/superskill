---
id: swift-obs-signpost-animations
lang: swift
prefix: obs
title: Measure animation work with beginAnimationInterval
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signpost, animation, transition, instruments]
  files: ["**/*.swift"]
  symbols: [beginAnimationInterval, OSSignposter]
related: [swift-obs-signpost-intervals, swift-obs-swiftui-updates]
sources:
  - title: OSSignposter
    url: https://developer.apple.com/documentation/os/ossignposter
---
> Open animation measurements with `beginAnimationInterval` instead of the generic interval API.

## Why

Apple documents `beginAnimationInterval` as beginning a signposted interval for measuring an animation, separate from the generic `beginInterval`. The distinction marks the interval as animation work so Instruments can treat it alongside its animation and hitch analysis instead of as an anonymous block. The matching end call is the same `endInterval` used for other intervals.

## Bad

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "animation")

func transition() {
    let id = signposter.makeSignpostID()
    let state = signposter.beginInterval("Transition", id: id)
    performAnimation()
    signposter.endInterval("Transition", state)
}

func performAnimation() {}
```

## Good

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "animation")

func transition() {
    let id = signposter.makeSignpostID()
    let state = signposter.beginAnimationInterval("Transition", id: id)
    performAnimation()
    signposter.endInterval("Transition", state)
}

func performAnimation() {}
```

## See Also

- [swift-obs-signpost-intervals](obs-signpost-intervals.md) - the general duration API
- [swift-obs-swiftui-updates](obs-swiftui-updates.md) - diagnosing the updates these animations trigger

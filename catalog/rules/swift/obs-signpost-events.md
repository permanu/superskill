---
id: swift-obs-signpost-events
lang: swift
prefix: obs
title: Mark points of interest with signpost events
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signpost, event, timeline, point of interest]
  files: ["**/*.swift"]
  symbols: [OSSignposter, emitEvent]
related: [swift-obs-signpost-intervals, swift-obs-signpost-logger-link]
sources:
  - title: OSSignposter
    url: https://developer.apple.com/documentation/os/ossignposter
---
> Emit a signpost event for discrete moments that matter instead of a printed line.

## Why

Apple documents `emitEvent` as marking a point of interest in time, and the OSSignposter overview names cases like a button tap or gesture as the intended use. An event carries the signposter's subsystem and category, so it lands on the Instruments timeline next to the intervals it explains. A printed line gives the same fact no place in the trace and no way to filter it.

## Bad

```swift
import Foundation

func playbackStarted() {
    print("playback started at \(Date())")
}
```

## Good

```swift
import os

let signposter = OSSignposter(subsystem: "com.example.app", category: "player")

func playbackStarted() {
    let id = signposter.makeSignpostID()
    signposter.emitEvent("PlaybackStarted", id: id)
}
```

## See Also

- [swift-obs-signpost-intervals](obs-signpost-intervals.md) - durations around these events
- [swift-obs-signpost-logger-link](obs-signpost-logger-link.md) - sharing the subsystem and category with logs

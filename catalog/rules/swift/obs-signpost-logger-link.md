---
id: swift-obs-signpost-logger-link
lang: swift
prefix: obs
title: Derive the signposter from the logger so they share a subsystem and category
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [signpost, logger, subsystem, category, correlation]
  files: ["**/*.swift"]
  symbols: [OSSignposter, Logger]
related: [swift-obs-signpost-intervals, swift-obs-log-levels]
sources:
  - title: OSSignposter
    url: https://developer.apple.com/documentation/os/ossignposter
  - title: Logger
    url: https://developer.apple.com/documentation/os/logger
---
> Create the signposter with `OSSignposter(logger:)` instead of a second subsystem or category.

## Why

Apple documents an `OSSignposter` initializer that uses the subsystem and category of an existing logger, and describes signposts as recording information with the same subsystems and categories used for logging. When the two disagree, a filter that isolates one feature area shows its logs or its signposts but not both. Deriving the signposter from the logger keeps a subsystem's timeline and its messages in one filterable stream.

## Bad

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "import")
let signposter = OSSignposter(subsystem: "com.example.app", category: "importing")
```

## Good

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "import")
let signposter = OSSignposter(logger: logger)
```

## See Also

- [swift-obs-signpost-intervals](obs-signpost-intervals.md) - the intervals recorded through that signposter
- [swift-obs-log-levels](obs-log-levels.md) - the messages recorded through the logger

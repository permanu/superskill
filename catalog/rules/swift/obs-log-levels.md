---
id: swift-obs-log-levels
lang: swift
prefix: obs
title: Choose the log level that matches the message's severity
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, log level, severity, os.log]
  files: ["**/*.swift"]
  symbols: [Logger, debug, error]
related: [swift-err-log-unified, swift-obs-log-privacy]
sources:
  - title: Logger
    url: https://developer.apple.com/documentation/os/logger
---
> Pick `debug`, `info`, `notice`, `error`, or `fault` by severity instead of logging everything at one level.

## Why

Apple's Logger documentation states that you choose a log level to indicate the severity of a message and that the level determines which messages stay in memory and which are written to disk. Logging every message at `error` makes the level useless for filtering and buries real failures in routine noise. Matching the level to the severity keeps the unified log searchable and the important messages durable.

## Bad

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "sync")

func report(_ message: String) {
    logger.error("\(message)")
}
```

## Good

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "sync")

func report(_ message: String) {
    logger.debug("\(message)")
}

func reportFailure(_ error: any Error) {
    logger.error("sync failed: \(String(describing: error))")
}
```

## See Also

- [swift-err-log-unified](err-log-unified.md) - recording failures through the same logger
- [swift-obs-log-privacy](obs-log-privacy.md) - the other per-message annotation that matters

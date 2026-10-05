---
id: swift-err-log-unified
lang: swift
prefix: err
title: Record handled failures with os.Logger using a subsystem, category, and level
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, logger, os, print, observability]
  files: ["**/*.swift"]
  symbols: [Logger, print, error]
related: [swift-err-wrap-context, swift-err-catch-rethrow-rest]
sources:
  - title: Logger
    url: https://developer.apple.com/documentation/os/logger
---
> Record handled failures with `os.Logger`, selecting a subsystem, category, and level instead of using `print`.

## Why

`print` writes unstructured text that the unified logging system cannot filter, level, or redact, and it remains in shipping builds. `Logger` accepts an optional subsystem and category that tag every message, so incidents can be isolated by functional area; it provides levels from debug through fault and redacts interpolated values by default to avoid leaking user data. Set the subsystem and category at creation so handled errors are filterable during diagnosis.

## Bad

```swift
func sync() async {
    do {
        try await upload()
    } catch {
        print("sync failed: \(error)")
    }
}

func upload() async throws {}
```

## Good

```swift
import os

private let logger = Logger(subsystem: "com.example.app", category: "sync")

func sync() async {
    do {
        try await upload()
    } catch {
        logger.error("sync failed: \(String(describing: error), privacy: .public)")
    }
}

func upload() async throws {}
```

## See Also

- [swift-err-wrap-context](err-wrap-context.md) - logging the context the wrapped error carries
- [swift-err-catch-rethrow-rest](err-catch-rethrow-rest.md) - logging at the layer that handles the failure

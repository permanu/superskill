---
id: swift-obs-metrickit-adopt
lang: swift
prefix: obs
title: Collect field performance data with MetricKit instead of local instrumentation only
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [metrickit, field metrics, diagnostics, reports]
  files: ["**/*.swift"]
  symbols: [MXMetricManager, MXMetricManagerSubscriber]
related: [swift-obs-metrickit-diagnostics, swift-obs-metrickit-memory]
sources:
  - title: MetricKit
    url: https://developer.apple.com/documentation/metrickit
---
> Subscribe to MetricKit so performance and diagnostic reports come from real users.

## Why

Apple describes MetricKit as providing on-device app diagnostics and power and performance metrics the system captures, delivered as daily metric reports and immediate diagnostic reports from real users. Locally recorded numbers reflect a handful of development devices and miss the configurations, data volumes, and OS states that produce field problems. Subscribing to `MXMetricManager` puts those reports in the app's hands.

## Bad

```swift
import Foundation

func recordLaunch(_ seconds: Double) {
    UserDefaults.standard.set(seconds, forKey: "lastLaunchTime")
}
```

## Good

```swift
import MetricKit

final class MetricsCollector: NSObject, MXMetricManagerSubscriber {
    func receive(_ payloads: [MXMetricPayload]) {}

    func receive(_ payloads: [MXDiagnosticPayload]) {}

    func start() {
        MXMetricManager.shared.add(self)
    }
}
```

## See Also

- [swift-obs-metrickit-diagnostics](obs-metrickit-diagnostics.md) - acting on the diagnostic half of the reports
- [swift-obs-metrickit-memory](obs-metrickit-memory.md) - the memory metric in the payload

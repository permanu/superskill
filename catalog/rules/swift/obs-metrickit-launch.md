---
id: swift-obs-metrickit-launch
lang: swift
prefix: obs
title: Watch launch and responsiveness metrics from field payloads
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [metrickit, launch, responsiveness, time to first draw]
  files: ["**/*.swift"]
  symbols: [MXMetricPayload, applicationLaunchMetrics]
related: [swift-obs-metrickit-adopt, swift-obs-metrickit-memory]
sources:
  - title: MetricKit
    url: https://developer.apple.com/documentation/metrickit
---
> Report the launch and responsiveness metrics so launch-time regressions surface before reviews do.

## Why

MetricKit groups time-to-first-draw, resume time, extended launch tasks, hang time, and hitch time under launch and responsiveness metrics, and delivers them from real users. These are the numbers users feel and reviewers measure; a team that tracks CPU and memory but not launch keeps discovering launch regressions after release. Reading both metric groups from each payload keeps the user-visible latency in the same report.

## Bad

```swift
import MetricKit

func report(_ payload: MXMetricPayload) -> String {
    guard let memory = payload.memoryMetrics else { return "" }
    return "peak memory: \(memory.peakMemoryUsage)"
}
```

## Good

```swift
import MetricKit

func report(_ payload: MXMetricPayload) -> String {
    var lines: [String] = []
    if let memory = payload.memoryMetrics {
        lines.append("peak memory: \(memory.peakMemoryUsage)")
    }
    if payload.applicationLaunchMetrics != nil {
        lines.append("launch: reported")
    }
    if payload.applicationResponsivenessMetrics != nil {
        lines.append("responsiveness: reported")
    }
    return lines.joined(separator: "\n")
}
```

## See Also

- [swift-obs-metrickit-adopt](obs-metrickit-adopt.md) - subscribing to receive these payloads
- [swift-obs-metrickit-memory](obs-metrickit-memory.md) - the resource metrics next to these latency metrics

---
id: swift-obs-metrickit-memory
lang: swift
prefix: obs
title: Track peak memory from field metric payloads alongside CPU
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [metrickit, memory, peak, footprint]
  files: ["**/*.swift"]
  symbols: [MXMemoryMetric, peakMemoryUsage]
related: [swift-obs-metrickit-adopt, swift-obs-metrickit-diagnostics]
sources:
  - title: MetricKit
    url: https://developer.apple.com/documentation/metrickit
---
> Read the memory metric in each payload instead of reporting CPU time alone.

## Why

The MetricKit page lists peak memory footprint and suspended memory as first-class metrics, alongside memory exception diagnostics generated when the app exceeds its limit. CPU time tells you the app is working, not why it is being terminated; a rising peak memory trend does. Reading the memory metric from the same payloads surfaces the resource that actually kills apps in the field.

## Bad

```swift
import MetricKit

func report(_ payload: MXMetricPayload) -> String {
    guard let cpu = payload.cpuMetrics else { return "" }
    return "cpu: \(cpu.cumulativeCPUTime)"
}
```

## Good

```swift
import MetricKit

func report(_ payload: MXMetricPayload) -> String {
    var lines: [String] = []
    if let cpu = payload.cpuMetrics {
        lines.append("cpu: \(cpu.cumulativeCPUTime)")
    }
    if let memory = payload.memoryMetrics {
        lines.append("peak memory: \(memory.peakMemoryUsage)")
    }
    return lines.joined(separator: "\n")
}
```

## See Also

- [swift-obs-metrickit-adopt](obs-metrickit-adopt.md) - subscribing to receive these payloads
- [swift-obs-metrickit-diagnostics](obs-metrickit-diagnostics.md) - the diagnostics that fire when memory runs out

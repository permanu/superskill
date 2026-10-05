---
id: swift-obs-metrickit-diagnostics
lang: swift
prefix: obs
title: Handle MetricKit diagnostic payloads for hangs and crashes
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [metrickit, diagnostics, hang, crash]
  files: ["**/*.swift"]
  symbols: [MXDiagnosticPayload, MXHangDiagnostic]
related: [swift-obs-metrickit-adopt, swift-obs-metrickit-memory]
sources:
  - title: MetricKit
    url: https://developer.apple.com/documentation/metrickit
---
> Read the diagnostic payloads, not just the metric payloads, and route hangs and crashes to fixes.

## Why

Apple's MetricKit page lists hang diagnostics as reports for an app that was too busy to handle user input responsively, crash diagnostics, and the other termination and exception families, and states that diagnostic reports arrive immediately. An implementation that implements both subscriber methods but ignores the diagnostic one collects performance trends while never seeing the field failures that explain them. Iterating the diagnostic payloads turns the reports into actionable regressions.

## Bad

```swift
import MetricKit

final class MetricsCollector: NSObject, MXMetricManagerSubscriber {
    func receive(_ payloads: [MXMetricPayload]) {}

    func receive(_ payloads: [MXDiagnosticPayload]) {}
}
```

## Good

```swift
import MetricKit

final class MetricsCollector: NSObject, MXMetricManagerSubscriber {
    func receive(_ payloads: [MXMetricPayload]) {}

    func receive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            for hang in payload.hangDiagnostics ?? [] {
                handle(hang)
            }
        }
    }

    private func handle(_ diagnostic: MXHangDiagnostic) {}
}
```

## See Also

- [swift-obs-metrickit-adopt](obs-metrickit-adopt.md) - subscribing to receive these payloads
- [swift-obs-metrickit-memory](obs-metrickit-memory.md) - the metric half of the same reporting

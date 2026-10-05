---
id: swift-obs-swiftui-updates
lang: swift
prefix: obs
title: Keep SwiftUI view body updates short by computing outside the body
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [swiftui, body, performance, view update]
  files: ["**/*.swift"]
  symbols: [View, body]
related: [swift-obs-signpost-animations, swift-conc-mainactor-isolate]
sources:
  - title: SwiftUI - Performance analysis
    url: https://developer.apple.com/documentation/swiftui/performance-analysis
---
> Move sorting, filtering, and formatting out of `body` so each view update does the minimum work.

## Why

SwiftUI's performance documentation directs you to use Instruments to analyze long view body updates and frequently occurring updates that contribute to hangs and hitches. A body that sorts or transforms its input repeats that work on every invalidation, and the cost grows with the data. Computing the derived value once when the model is created keeps each update proportional to rendering only.

## Bad

```swift
import SwiftUI

struct ReportView: View {
    let rows: [String]

    var body: some View {
        List(rows.sorted(), id: \.self) { row in
            Text(row)
        }
    }
}
```

## Good

```swift
import SwiftUI

struct Report {
    let sortedRows: [String]

    init(rows: [String]) {
        sortedRows = rows.sorted()
    }
}

struct ReportView: View {
    let report: Report

    var body: some View {
        List(report.sortedRows, id: \.self) { row in
            Text(row)
        }
    }
}
```

## See Also

- [swift-obs-signpost-animations](obs-signpost-animations.md) - measuring the animations these updates drive
- [swift-conc-mainactor-isolate](conc-mainactor-isolate.md) - the actor that runs body evaluations

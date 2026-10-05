---
id: swift-conc-concurrent-offload
lang: swift
prefix: conc
title: Mark CPU-bound async work @concurrent so it leaves the caller's actor
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [concurrent, offload, main actor, cpu bound]
  files: ["**/*.swift"]
  symbols: ["@concurrent", MainActor]
related: [swift-conc-mainactor-isolate, swift-conc-actor-state]
sources:
  - title: Swift Evolution SE-0461 - Run nonisolated async functions on the caller's actor by default
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Annotate CPU-bound async functions with `@concurrent` so calls switch off the caller's actor.

## Why

`@concurrent` is the explicit spelling for an async function that always switches off an actor to run, so heavy computation does not execute on the main actor while the UI waits. SE-0461 introduces it as the long-term way to move functions off actors, with stricter sendability requirements on arguments and results. Nonisolated async functions currently run off the caller's actor by default; under the opt-in `NonisolatedNonsendingByDefault` feature that default changes, so writing `@concurrent` states the off-actor behavior explicitly and keeps it in both language modes.

## Bad

```swift
@MainActor
final class ReportModel {
    var text = ""

    func generate() {
        text = render()
    }

    private func render() -> String {
        (0..<50_000).map { _ in "row" }.joined(separator: "\n")
    }
}
```

## Good

```swift
@concurrent
func renderReport() async -> String {
    (0..<50_000).map { _ in "row" }.joined(separator: "\n")
}

@MainActor
final class ReportModel {
    var text = ""

    func generate() async {
        text = await renderReport()
    }
}
```

## See Also

- [swift-conc-mainactor-isolate](conc-mainactor-isolate.md) - the isolation this rule moves work away from
- [swift-conc-actor-state](conc-actor-state.md) - shared state that must not be touched from concurrent work

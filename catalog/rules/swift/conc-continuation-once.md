---
id: swift-conc-continuation-once
prefix: conc
lang: swift
title: Resume every checked continuation exactly once on every execution path
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [continuation, resume, bridging, callback]
  files: ["**/*.swift"]
  symbols: [withCheckedContinuation, CheckedContinuation, resume]
related: [swift-conc-taskgroup-fanout]
sources:
  - title: CheckedContinuation
    url: https://developer.apple.com/documentation/swift/checkedcontinuation
  - title: The Swift Programming Language - Concurrency
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/
---
> Call exactly one resume method on every execution path of a checked continuation.

## Why

Apple documents the invariant directly: you must call a resume method exactly once on every execution path, resuming more than once is undefined behavior, and never resuming leaves the task suspended forever while leaking its resources. Checked continuations log violations instead of corrupting the runtime silently, which is why they are the default choice over unsafe continuations during development. One resume per path keeps the bridging between callback and async worlds sound.

## Bad

```swift
func currentValue() async -> String {
    await withCheckedContinuation { continuation in
        continuation.resume(returning: "cached")
        continuation.resume(returning: "fresh")
    }
}
```

## Good

```swift
func currentValue() async -> String {
    await withCheckedContinuation { continuation in
        continuation.resume(returning: "fresh")
    }
}
```

## See Also

- [swift-conc-taskgroup-fanout](conc-taskgroup-fanout.md) - structured alternatives when no callback bridge is needed

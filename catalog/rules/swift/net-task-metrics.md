---
id: swift-net-task-metrics
lang: swift
prefix: net
title: Read the metrics URLSession collects for a task
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [task metrics, latency, urlsession]
  files: ["**/*.swift"]
related: [swift-obs-signpost-intervals, swift-net-timeout]
sources:
  - title: URLSessionTaskMetrics
    url: https://developer.apple.com/documentation/foundation/urlsessiontaskmetrics
  - title: URLSessionTaskDelegate.urlSession(_:task:didFinishCollecting:)
    url: https://developer.apple.com/documentation/foundation/urlsessiontaskdelegate/urlsession(_:task:didfinishcollecting:)
---
> Read the metrics URLSession collects for a task.

## Why

Apple documents `URLSessionTaskMetrics` as encapsulating the metrics for a session task: each object contains the task interval and the redirect count, plus metrics for each request-and-response transaction made during the task, and the delegate's `urlSession(_:task:didFinishCollecting:)` method reports when the session finished collecting them. A delegate that logs only the request URL discards the latency and connection data the system already measured. Recording the interval and redirect count turns a slow endpoint into a number that can be compared across releases.

## Bad

```swift
import Foundation

final class Observer: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didFinishCollecting metrics: URLSessionTaskMetrics
    ) {
        print(task.originalRequest?.url as Any)
    }
}
```

## Good

```swift
import Foundation

final class Observer: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didFinishCollecting metrics: URLSessionTaskMetrics
    ) {
        print(metrics.taskInterval.duration, metrics.redirectCount)
    }
}
```

## See Also

- [swift-obs-signpost-intervals](obs-signpost-intervals.md) - measuring durations in the app's own code
- [swift-net-timeout](net-timeout.md) - the timeout that shapes those durations

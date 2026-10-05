---
id: swift-net-timeout
lang: swift
prefix: net
title: Set the request timeout deliberately
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [timeout, urlsessionconfiguration]
  files: ["**/*.swift"]
related: [swift-net-connectivity-wait, swift-sec-ephemeral-session]
sources:
  - title: URLSessionConfiguration.timeoutIntervalForRequest
    url: https://developer.apple.com/documentation/foundation/urlsessionconfiguration/timeoutintervalforrequest
---
> Set the request timeout deliberately instead of accepting the default.

## Why

Apple documents `timeoutIntervalForRequest` as controlling how long, in seconds, a task waits for additional data before giving up, with the timer reset whenever new data arrives and a default value of 60 seconds. The value applies to every task in sessions based on the configuration, so an interactive request and a background sync share the same ceiling unless it is set. Choosing the interval per session states how long a stalled transfer may hold the caller before it fails.

## Bad

```swift
import Foundation

let configuration = URLSessionConfiguration.default
let session = URLSession(configuration: configuration)
print(session)
```

## Good

```swift
import Foundation

let configuration = URLSessionConfiguration.default
configuration.timeoutIntervalForRequest = 15
let session = URLSession(configuration: configuration)
print(session)
```

## See Also

- [swift-net-connectivity-wait](net-connectivity-wait.md) - what happens while waiting for the network
- [swift-sec-ephemeral-session](sec-ephemeral-session.md) - the storage policy set on the same configuration

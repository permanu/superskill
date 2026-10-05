---
id: swift-net-connectivity-wait
lang: swift
prefix: net
title: Let sessions wait for connectivity
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [waitsforconnectivity, offline, connectivity]
  files: ["**/*.swift"]
related: [swift-net-timeout, swift-net-background-session]
sources:
  - title: URLSessionConfiguration.waitsForConnectivity
    url: https://developer.apple.com/documentation/foundation/urlsessionconfiguration/waitsforconnectivity
---
> Let sessions wait for connectivity instead of failing immediately.

## Why

Apple documents `waitsForConnectivity` as indicating whether a session waits for connectivity to become available or fails immediately. When it is `true` and connectivity is unavailable, the session calls the delegate's `urlSession(_:taskIsWaitingForConnectivity:)` method and waits; when it is `false`, the connection fails at once with an error such as `NSURLErrorNotConnectedToInternet`. A transient dead zone then becomes a failed request that the caller has to schedule again. Background sessions always wait for connectivity, so this setting applies to the foreground sessions an app creates.

## Bad

```swift
import Foundation

let configuration = URLSessionConfiguration.default
configuration.waitsForConnectivity = false
let session = URLSession(configuration: configuration)
print(session)
```

## Good

```swift
import Foundation

let configuration = URLSessionConfiguration.default
configuration.waitsForConnectivity = true
let session = URLSession(configuration: configuration)
print(session)
```

## See Also

- [swift-net-timeout](net-timeout.md) - bounding the wait with a timeout
- [swift-net-background-session](net-background-session.md) - sessions that always wait

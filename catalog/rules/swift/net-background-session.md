---
id: swift-net-background-session
lang: swift
prefix: net
title: Use a background session for transfers that must finish
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [background session, downloads, uploads]
  files: ["**/*.swift"]
related: [swift-net-connectivity-wait, swift-net-session-invalidate]
sources:
  - title: URLSessionConfiguration.background(withIdentifier:)
    url: https://developer.apple.com/documentation/foundation/urlsessionconfiguration/background(withidentifier:)
---
> Use a background session for transfers that must finish outside the app.

## Why

Apple documents `background(withIdentifier:)` as creating a configuration that allows uploads and downloads to be performed in the background, hands control of the transfers to the system in a separate process, and in iOS lets transfers continue even when the app is suspended or terminated. A default session's transfers stop when the app stops running. The identifier must be non-empty, and the app can reattach to the same session after a relaunch to retrieve the status of transfers that were in progress.

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

let configuration = URLSessionConfiguration.background(withIdentifier: "com.example.sync")
let session = URLSession(configuration: configuration)
print(session)
```

## See Also

- [swift-net-connectivity-wait](net-connectivity-wait.md) - foreground sessions that wait for the network
- [swift-net-session-invalidate](net-session-invalidate.md) - releasing the session when the work is done

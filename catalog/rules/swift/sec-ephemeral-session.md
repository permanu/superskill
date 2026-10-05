---
id: swift-sec-ephemeral-session
lang: swift
prefix: sec
title: Use an ephemeral session configuration for sensitive requests
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [urlsession, cache, cookies, credentials, ephemeral]
  files: ["**/*.swift"]
  symbols: [URLSessionConfiguration, ephemeral]
related: [swift-sec-ats-trust, swift-sec-urlcomponents]
sources:
  - title: URLSessionConfiguration
    url: https://developer.apple.com/documentation/foundation/urlsessionconfiguration
---
> Configure sensitive network sessions as ephemeral so nothing is written to disk.

## Why

Apple documents ephemeral sessions as similar to default sessions except that they don't write caches, cookies, or credentials to disk. A default session persists response bodies and authentication state in the app container, where they survive the request and can be recovered from a backup or a compromised file store. An ephemeral configuration keeps that state in memory for the lifetime of the session.

## Bad

```swift
import Foundation

func makeSession() -> URLSession {
    URLSession(configuration: .default)
}
```

## Good

```swift
import Foundation

func makeSession() -> URLSession {
    URLSession(configuration: .ephemeral)
}
```

## See Also

- [swift-sec-ats-trust](sec-ats-trust.md) - the server trust policy for that session
- [swift-sec-urlcomponents](sec-urlcomponents.md) - what the session requests

---
id: swift-sec-urlcomponents
lang: swift
prefix: sec
title: Build URLs from components so untrusted input is encoded
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [url, encoding, injection, urlcomponents]
  files: ["**/*.swift"]
  symbols: [URLComponents, URL]
related: [swift-sec-ats-trust, swift-sec-ephemeral-session]
sources:
  - title: URLComponents
    url: https://developer.apple.com/documentation/foundation/urlcomponents
---
> Construct URLs with URLComponents instead of concatenating untrusted segments into a string.

## Why

Apple documents URLComponents as parsing and constructing URLs according to RFC 3986, with an initializer that IDNA- and percent-encodes invalid characters. String concatenation inserts the raw characters of an untrusted name or query value, so a crafted segment can add a path traversal, a query parameter, or a fragment that changes what the request addresses. Setting the component fields makes the framework encode the value in its field.

## Bad

```swift
import Foundation

func profileURL(base: String, name: String) -> URL? {
    URL(string: base + "/users/" + name)
}
```

## Good

```swift
import Foundation

func profileURL(base: URL, name: String) -> URL? {
    var components = URLComponents(url: base, resolvingAgainstBaseURL: false)
    components?.path = "/users/" + name
    return components?.url
}
```

## See Also

- [swift-sec-ats-trust](sec-ats-trust.md) - the connection policy for the URL produced here
- [swift-sec-ephemeral-session](sec-ephemeral-session.md) - sending sensitive requests to that URL

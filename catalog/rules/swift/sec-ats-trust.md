---
id: swift-sec-ats-trust
lang: swift
prefix: sec
title: Keep App Transport Security's server trust evaluation in place
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ats, tls, server trust, urlsession, certificate]
  files: ["**/*.swift"]
  symbols: [URLSessionDelegate, URLAuthenticationChallenge]
related: [swift-sec-ephemeral-session, swift-sec-urlcomponents]
sources:
  - title: NSAppTransportSecurity
    url: https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity
  - title: URLSessionConfiguration
    url: https://developer.apple.com/documentation/foundation/urlsessionconfiguration
---
> Let the system evaluate server trust instead of accepting any credential in a challenge handler.

## Why

Apple documents App Transport Security as requiring HTTPS for URL Loading System connections and imposing extended security checks that supplement the default server trust evaluation, with the explicit instruction to improve server security before loosening ATS because exceptions reduce the app's security. A delegate that returns a credential built from whatever `serverTrust` the challenge carries accepts any certificate, including one from an interceptor. Default handling keeps the chain and hostname checks active.

## Bad

```swift
import Foundation

final class TrustAllDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        let credential = URLCredential(trust: challenge.protectionSpace.serverTrust!)
        completionHandler(.useCredential, credential)
    }
}
```

## Good

```swift
import Foundation

final class DefaultTrustDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        completionHandler(.performDefaultHandling, nil)
    }
}
```

## See Also

- [swift-sec-ephemeral-session](sec-ephemeral-session.md) - the transport configuration for sensitive requests
- [swift-sec-urlcomponents](sec-urlcomponents.md) - constructing the URLs those requests target

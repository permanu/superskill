---
id: swift-obs-log-privacy
lang: swift
prefix: obs
title: Keep default log redaction for user data and publish only what is safe
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [logging, privacy, redaction, sensitive data]
  files: ["**/*.swift"]
  symbols: [Logger, privacy, public, private]
related: [swift-obs-log-levels, swift-sec-keychain-secrets]
sources:
  - title: Logger
    url: https://developer.apple.com/documentation/os/logger
---
> Mark interpolated values public only when they contain no sensitive information.

## Why

Apple documents that the system redacts interpolated strings and objects by default to prevent leaking user-sensitive information into log files, and that you opt a value out of redaction with the privacy option when it is safe. A blanket `.public` annotation on an account identifier or token writes it into a log store that outlives the request and is readable by diagnostic tooling. Keeping the default redaction, and marking only non-sensitive fields public, makes the choice per value.

## Bad

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "account")

func signedIn(account: String, role: String) {
    logger.log("Signed in; role \(role, privacy: .public) for \(account, privacy: .public)")
}
```

## Good

```swift
import os

let logger = Logger(subsystem: "com.example.app", category: "account")

func signedIn(account: String, role: String) {
    logger.log("Signed in; role \(role, privacy: .public) for \(account, privacy: .private)")
}
```

## See Also

- [swift-obs-log-levels](obs-log-levels.md) - the severity annotation for the same message
- [swift-sec-keychain-secrets](sec-keychain-secrets.md) - where the account secret belongs instead

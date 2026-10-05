---
id: swift-err-localized-user-message
lang: swift
prefix: err
title: Conform user-facing errors to LocalizedError with an errorDescription
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [localized, user message, alert, errorDescription]
  files: ["**/*.swift"]
  symbols: [LocalizedError, errorDescription, localizedDescription]
related: [swift-err-wrap-context, swift-err-ns-catch-typed]
sources:
  - title: LocalizedError
    url: https://developer.apple.com/documentation/foundation/localizederror
---
> Give every error that can reach a person a `LocalizedError.errorDescription` instead of interpolating the raw case.

## Why

The default description of an error enum is a case dump such as `fileMissing("report.pdf")`, not a sentence a person can act on. `LocalizedError` defines `errorDescription`, `failureReason`, `recoverySuggestion`, and `helpAnchor` as the user-facing channel consumed by Cocoa presentation APIs. Conforming user-facing errors to it gives the interface layer one stable, localizable source of message text.

## Bad

```swift
import Foundation

enum DownloadError: Error {
    case offline
    case fileMissing(String)
}

func alertMessage(for error: any Error) -> String {
    "Download failed: \(error)"
}
```

## Good

```swift
import Foundation

enum DownloadError: LocalizedError {
    case offline
    case fileMissing(String)

    var errorDescription: String? {
        switch self {
        case .offline: "You appear to be offline."
        case .fileMissing(let name): "The file \(name) could not be found."
        }
    }
}

func alertMessage(for error: any Error) -> String {
    (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
}
```

## See Also

- [swift-err-wrap-context](err-wrap-context.md) - preserving the cause behind a user-facing message
- [swift-err-ns-catch-typed](err-ns-catch-typed.md) - catching the platform failures these messages describe

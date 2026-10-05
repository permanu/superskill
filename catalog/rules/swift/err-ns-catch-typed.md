---
id: swift-err-ns-catch-typed
lang: swift
prefix: err
title: Catch bridged Cocoa failures as CocoaError cases, not NSError domain and code pairs
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cocoa, nserror, domain, code, catch]
  files: ["**/*.swift"]
  symbols: [CocoaError, NSError, FileManager]
related: [swift-err-localized-user-message, swift-err-wrap-context]
sources:
  - title: Handling Cocoa Errors in Swift
    url: https://developer.apple.com/documentation/swift/handling-cocoa-errors-in-swift
  - title: The Swift Programming Language - Error Handling
    url: https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/
---
> Catch Cocoa failures as typed `CocoaError` cases instead of matching `NSError` domain and numeric code.

## Why

Cocoa APIs import into Swift as throwing methods, and Apple's guide demonstrates matching on `CocoaError.fileNoSuchFile` directly rather than inspecting `domain` and `code`. Domain strings and numeric codes are unreadable at the catch site, easy to get wrong, and invisible to the compiler; typed cases name the failure family and keep matching exhaustive in the pattern-matching sense. The book's note on NSError interop confirms the two representations bridge, so the typed case is available wherever the raw pair is.

## Bad

```swift
import Foundation

func removeIfExists(_ url: URL) {
    do {
        try FileManager.default.removeItem(at: url)
    } catch let error as NSError where error.domain == NSCocoaErrorDomain && error.code == 4 {
        return
    } catch {
        print("remove failed: \(error)")
    }
}
```

## Good

```swift
import Foundation

func removeIfExists(_ url: URL) throws {
    do {
        try FileManager.default.removeItem(at: url)
    } catch CocoaError.fileNoSuchFile {
        return
    }
}
```

## See Also

- [swift-err-localized-user-message](err-localized-user-message.md) - presenting the caught failure to a person
- [swift-err-wrap-context](err-wrap-context.md) - wrapping a caught Cocoa error in a domain error

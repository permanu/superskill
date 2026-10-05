---
id: swift-sec-file-protection
lang: swift
prefix: sec
title: Write sensitive files with complete data protection
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [file protection, encryption at rest, data protection]
  files: ["**/*.swift"]
  symbols: [FileProtectionType, completeFileProtection]
related: [swift-sec-keychain-accessibility, swift-sec-cryptokit-key-storage]
sources:
  - title: FileProtectionType
    url: https://developer.apple.com/documentation/foundation/fileprotectiontype
---
> Mark files that contain sensitive data with the `complete` file protection level.

## Why

Apple documents the protection levels directly: `complete` stores the file encrypted on disk so it cannot be read or written while the device is locked or booting, while `none` applies no special protections. A plain write leaves the protection level to the file system default and may keep the data readable in states where it should not be. Passing the option at write time binds the strongest level to the file from the moment it exists.

## Bad

```swift
import Foundation

func writeSecret(_ data: Data, to url: URL) throws {
    try data.write(to: url)
}
```

## Good

```swift
import Foundation

func writeSecret(_ data: Data, to url: URL) throws {
    try data.write(to: url, options: [.completeFileProtection])
}
```

## See Also

- [swift-sec-keychain-accessibility](sec-keychain-accessibility.md) - the keychain's version of an access policy
- [swift-sec-cryptokit-key-storage](sec-cryptokit-key-storage.md) - encrypting before the write instead

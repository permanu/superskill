---
id: swift-sec-keychain-accessibility
lang: swift
prefix: sec
title: Set the most restrictive keychain accessibility that the item can tolerate
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [keychain, accessibility, thisdeviceonly, protection]
  files: ["**/*.swift"]
  symbols: [kSecAttrAccessible, SecItemAdd]
related: [swift-sec-keychain-secrets, swift-sec-file-protection]
sources:
  - title: Restricting keychain item accessibility
    url: https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility
---
> Choose a keychain accessibility value explicitly, preferring the most restrictive one the item can tolerate.

## Why

Apple's guide states that keychain services' default behavior is a reasonable trade-off but not always the right one, that the default is accessible whenever the device is unlocked, and that you should always use the most restrictive option that makes sense. It also documents that values ending in `ThisDeviceOnly` are not migrated when restoring another device's backup. An explicit attribute keeps a secret off restored devices and out of background access it does not need.

## Bad

```swift
import Foundation
import Security

func addPassword(_ password: Data, account: String) -> OSStatus {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: password
    ]
    return SecItemAdd(query as CFDictionary, nil)
}
```

## Good

```swift
import Foundation
import Security

func addPassword(_ password: Data, account: String) -> OSStatus {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        kSecValueData as String: password
    ]
    return SecItemAdd(query as CFDictionary, nil)
}
```

## See Also

- [swift-sec-keychain-secrets](sec-keychain-secrets.md) - storing the secret itself
- [swift-sec-file-protection](sec-file-protection.md) - the file-system equivalent of this policy

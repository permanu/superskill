---
id: swift-sec-keychain-secrets
lang: swift
prefix: sec
title: Store credentials in the keychain instead of user defaults or files
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [keychain, token, password, secrets, userdefaults]
  files: ["**/*.swift"]
  symbols: [SecItemAdd, UserDefaults]
related: [swift-sec-keychain-accessibility, swift-sec-cryptokit-key-storage]
sources:
  - title: Keychain services
    url: https://developer.apple.com/documentation/security/keychain-services
---
> Persist tokens and passwords as keychain items, never in user defaults or plain files.

## Why

Keychain services stores small secrets in an encrypted database and hands apps a mechanism to remember them on the user's behalf, as Apple's overview describes. User defaults and plain files are unencrypted property lists that any backup, debugging session, or file-read primitive exposes. Moving the secret into a keychain item makes encryption and access control the platform's responsibility.

## Bad

```swift
import Foundation

func storeToken(_ token: String) {
    UserDefaults.standard.set(token, forKey: "authToken")
}
```

## Good

```swift
import Foundation
import Security

func storeToken(_ token: String, account: String) throws {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: Data(token.utf8)
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
    }
}
```

## See Also

- [swift-sec-keychain-accessibility](sec-keychain-accessibility.md) - choosing the item's accessibility policy
- [swift-sec-cryptokit-key-storage](sec-cryptokit-key-storage.md) - persisting cryptographic keys the same way

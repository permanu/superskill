---
id: swift-sec-cryptokit-key-storage
lang: swift
prefix: sec
title: Persist CryptoKit keys as keychain items instead of defaults or constants
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [cryptokit, key, persistence, keychain, symmetrickey]
  files: ["**/*.swift"]
  symbols: [SymmetricKey, SecItemAdd]
related: [swift-sec-keychain-secrets, swift-sec-crypto-aead]
sources:
  - title: Storing CryptoKit Keys in the Keychain
    url: https://developer.apple.com/documentation/cryptokit/storing-cryptokit-keys-in-the-keychain
  - title: Keychain services
    url: https://developer.apple.com/documentation/security/keychain-services
---
> Store long-lived cryptographic keys as keychain items rather than user defaults or source constants.

## Why

Apple's article explains that CryptoKit keys have no direct keychain corollary and are packaged as generic passwords so Keychain Services can store them, and it shows the add query that persists the key bytes. Keys that live only in user defaults or in a source constant are either unprotected or shared by every installation. A keychain item encrypts the key at rest and scopes it to the app.

## Bad

```swift
import CryptoKit
import Foundation

func persist(_ key: SymmetricKey) {
    let data = key.withUnsafeBytes { Data($0) }
    UserDefaults.standard.set(data, forKey: "encryptionKey")
}
```

## Good

```swift
import CryptoKit
import Foundation
import Security

func persist(_ key: SymmetricKey, account: String) throws {
    let data = key.withUnsafeBytes { Data($0) }
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked,
        kSecValueData as String: data
    ]
    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
        throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
    }
}
```

## See Also

- [swift-sec-keychain-secrets](sec-keychain-secrets.md) - the general secret-storage rule
- [swift-sec-crypto-aead](sec-crypto-aead.md) - where the persisted key gets used

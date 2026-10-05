---
id: swift-sec-crypto-aead
lang: swift
prefix: sec
title: Encrypt with CryptoKit's authenticated ciphers instead of hand-rolled transforms
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [encryption, cryptokit, aes, aead, confidentiality]
  files: ["**/*.swift"]
  symbols: [AES, ChaChaPoly, SymmetricKey]
related: [swift-sec-cryptokit-key-storage, swift-sec-crypto-hash]
sources:
  - title: Apple CryptoKit
    url: https://developer.apple.com/documentation/cryptokit
---
> Use CryptoKit's AES-GCM or ChaChaPoly for encryption instead of a custom byte transform.

## Why

Apple's overview says to prefer CryptoKit over lower-level interfaces because it frees the app from managing raw pointers and handles tasks that make the app more secure, such as overwriting sensitive data during deallocation, and it lists AES and ChaChaPoly as the supported ciphers. A hand-written transform such as XOR offers no integrity protection and leaks structure in the plaintext. CryptoKit's sealed boxes produce authenticated ciphertext that detects tampering.

## Bad

```swift
func encrypt(_ data: [UInt8], key: [UInt8]) -> [UInt8] {
    zip(data, key).map { $0.0 ^ $0.1 }
}
```

## Good

```swift
import CryptoKit
import Foundation

func encrypt(_ data: Data, using key: SymmetricKey) throws -> Data {
    let sealed = try AES.GCM.seal(data, using: key)
    guard let combined = sealed.combined else {
        throw CryptoKitError.incorrectParameterSize
    }
    return combined
}
```

## See Also

- [swift-sec-cryptokit-key-storage](sec-cryptokit-key-storage.md) - persisting the key used here
- [swift-sec-crypto-hash](sec-crypto-hash.md) - the digest counterpart for integrity checks

---
id: swift-sec-secure-enclave
lang: swift
prefix: sec
title: Keep device-bound private keys in the Secure Enclave
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [secure enclave, private key, signing, key agreement]
  files: ["**/*.swift"]
  symbols: [SecureEnclave, P256]
related: [swift-sec-biometric-gate, swift-sec-cryptokit-key-storage]
sources:
  - title: SecureEnclave
    url: https://developer.apple.com/documentation/cryptokit/secureenclave
  - title: Apple CryptoKit
    url: https://developer.apple.com/documentation/cryptokit
---
> Generate private keys inside the Secure Enclave when the key must not leave the device.

## Why

CryptoKit's overview states that in addition to keys in memory you can use private keys stored in and managed by the Secure Enclave, and the SecureEnclave type is documented as the device's hardware-based key manager with an `isAvailable` check for support. A P-256 key created in software can be copied off the device once its bytes are exposed; a Secure Enclave key performs its signing or key agreement in hardware and its raw bytes never leave. Device-bound authentication needs the hardware-backed form.

## Bad

```swift
import CryptoKit

func makeSigningKey() -> P256.Signing.PrivateKey {
    P256.Signing.PrivateKey()
}
```

## Good

```swift
import CryptoKit

func makeSigningKey() throws -> SecureEnclave.P256.Signing.PrivateKey? {
    guard SecureEnclave.isAvailable else { return nil }
    return try SecureEnclave.P256.Signing.PrivateKey()
}
```

## See Also

- [swift-sec-biometric-gate](sec-biometric-gate.md) - user presence checks around hardware-backed keys
- [swift-sec-cryptokit-key-storage](sec-cryptokit-key-storage.md) - persisting Secure Enclave keys across launches

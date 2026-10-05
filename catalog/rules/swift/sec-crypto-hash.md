---
id: swift-sec-crypto-hash
lang: swift
prefix: sec
title: Use CryptoKit's secure digests for integrity checks
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [hash, digest, sha256, integrity, checksum]
  files: ["**/*.swift"]
  symbols: [SHA256, HashFunction]
related: [swift-sec-crypto-aead, swift-sec-random-unpredictable]
sources:
  - title: Apple CryptoKit
    url: https://developer.apple.com/documentation/cryptokit
---
> Hash data with CryptoKit's SHA-2 family instead of an ad hoc checksum.

## Why

CryptoKit's overview lists computing and comparing cryptographically secure digests as a primary operation and provides SHA-256 and the rest of the SHA-2 family as `HashFunction` implementations. A homemade rolling hash such as `hash = hash * 31 + byte` is trivial to collide and gives an attacker a way to substitute content that passes the check. A cryptographic digest makes collisions infeasible.

## Bad

```swift
func checksum(_ data: [UInt8]) -> Int {
    data.reduce(0) { ($0 &* 31) &+ Int($1) }
}
```

## Good

```swift
import CryptoKit
import Foundation

func checksum(_ data: Data) -> SHA256Digest {
    SHA256.hash(data: data)
}
```

## See Also

- [swift-sec-crypto-aead](sec-crypto-aead.md) - encryption for confidentiality, not just integrity
- [swift-sec-random-unpredictable](sec-random-unpredictable.md) - the other primitive to take from the system

---
id: swift-sec-random-unpredictable
lang: swift
prefix: sec
title: Draw security tokens from the system random generator
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [random, token, nonce, generator, entropy]
  files: ["**/*.swift"]
  symbols: [SystemRandomNumberGenerator, random]
related: [swift-sec-crypto-hash, swift-sec-crypto-aead]
sources:
  - title: SystemRandomNumberGenerator
    url: https://developer.apple.com/documentation/swift/systemrandomnumbergenerator
---
> Generate tokens, nonces, and keys with `SystemRandomNumberGenerator` or the default `random` APIs.

## Why

The standard library documents `SystemRandomNumberGenerator` as the generator used by default for random values, automatically seeded, thread-safe, and cryptographically secure whenever possible, backed by `arc4random_buf` on Apple platforms. A custom generator such as a linear congruential generator carries a small internal state that an observer can predict from a few outputs. Security values must come from the system source, not from a generator whose sequence is reproducible.

## Bad

```swift
struct LinearCongruential {
    var state: UInt64

    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state
    }
}

func makeToken(_ generator: inout LinearCongruential) -> UInt64 {
    generator.next()
}
```

## Good

```swift
func makeToken() -> UInt64 {
    var generator = SystemRandomNumberGenerator()
    return generator.next()
}
```

## See Also

- [swift-sec-crypto-hash](sec-crypto-hash.md) - the digest counterpart from the same system
- [swift-sec-crypto-aead](sec-crypto-aead.md) - where the generated key material gets used

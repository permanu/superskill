---
id: go-sec-md5
lang: go
prefix: sec
title: Never use MD5 or SHA-1 for security-sensitive hashing
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [md5, sha1, hash, collision, fingerprint]
  files: ["**/*.go"]
  symbols: [md5.Sum, sha256.Sum256]
related: [go-sec-crypto-rand, go-sec-subtle-compare]
sources:
  - title: Package crypto/md5
    url: https://pkg.go.dev/crypto/md5
  - title: Package crypto/sha1
    url: https://pkg.go.dev/crypto/sha1
---
> Hash with SHA-256 or stronger; MD5 and SHA-1 are broken for security use.

## Why

The crypto/md5 documentation states plainly that MD5 is cryptographically broken and should not be used for secure applications, and SHA-1 carries the same warning in its package. Collisions in these hashes let an attacker substitute one input for another while the digest stays the same, which breaks signatures, integrity checks, and fingerprint-based comparisons. The crypto/sha256 package provides the drop-in replacement for new code.

## Bad

```go
import "crypto/md5"

func fingerprint(data []byte) []byte {
    sum := md5.Sum(data)
    return sum[:]
}
```

## Good

```go
import "crypto/sha256"

func fingerprint(data []byte) []byte {
    sum := sha256.Sum256(data)
    return sum[:]
}
```

## See Also

- [go-sec-crypto-rand](sec-crypto-rand.md) - the randomness half of the cryptographic toolkit
- [go-sec-subtle-compare](sec-subtle-compare.md) - comparing the digests correctly

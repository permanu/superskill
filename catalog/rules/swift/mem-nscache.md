---
id: swift-mem-nscache
lang: swift
prefix: mem
title: Use NSCache for caches that should be evicted under memory pressure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nscache, cache, eviction, memory pressure]
  files: ["**/*.swift"]
  symbols: [NSCache]
related: [swift-arc-weak-cycle, swift-mem-reserve-known]
sources:
  - title: NSCache
    url: https://developer.apple.com/documentation/foundation/nscache
---
> Store disposable, expensive objects in `NSCache` instead of a dictionary you manage yourself.

## Why

Apple documents `NSCache` as incorporating auto-eviction policies that keep the cache from using too much memory and removing items when the system needs memory, and as safe to access from multiple threads without external locking. A plain dictionary cache grows without bound and can push the app toward a memory-warning termination. `NSCache` exists precisely for transient objects that are expensive to create but safe to discard and recompute.

## Bad

```swift
import Foundation

final class ImageStore {
    private var images: [String: Data] = [:]

    func image(for key: String) -> Data? {
        images[key]
    }

    func store(_ image: Data, for key: String) {
        images[key] = image
    }
}
```

## Good

```swift
import Foundation

final class ImageStore {
    private let images = NSCache<NSString, NSData>()

    func image(for key: String) -> Data? {
        guard let data = images.object(forKey: key as NSString) else { return nil }
        return data as Data
    }

    func store(_ image: Data, for key: String) {
        images.setObject(image as NSData, forKey: key as NSString)
    }
}
```

## See Also

- [swift-arc-weak-cycle](arc-weak-cycle.md) - the other common cause of unbounded memory growth
- [swift-mem-reserve-known](mem-reserve-known.md) - sizing a container that does not evict

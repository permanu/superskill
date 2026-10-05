---
id: swift-conc-global-actor
lang: swift
prefix: conc
title: Isolate a whole subsystem with a custom global actor instead of threading one actor instance
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [global actor, subsystem, isolation, singleton]
  files: ["**/*.swift"]
  symbols: [globalActor, GlobalActor, MainActor]
related: [swift-conc-actor-state, swift-conc-mainactor-isolate]
sources:
  - title: Swift Evolution SE-0316 - Global actors
    url: https://github.com/swiftlang/swift-evolution/blob/main/proposals/0316-global-actors.md
---
> Declare a global actor for a subsystem so its scattered state and operations share one isolation domain.

## Why

Global actors extend actor isolation beyond a single instance: a declaration annotated with the global actor type joins that domain, and all of the normal actor-isolation checks apply to it. The proposal motivates this for state that is scattered across many types, where routing every call through one injected actor instance spreads a dependency through the whole call graph. A custom global actor keeps the isolation rule at the declarations themselves.

## Bad

```swift
actor ImageCache {
    private var images: [String: String] = [:]

    func store(_ image: String, for key: String) {
        images[key] = image
    }
}

final class FeedController {
    private let cache: ImageCache

    init(cache: ImageCache) {
        self.cache = cache
    }

    func show(image: String, key: String) async {
        await cache.store(image, for: key)
    }
}
```

## Good

```swift
@globalActor
actor ImageCacheActor {
    static let shared = ImageCacheActor()
}

@ImageCacheActor
final class ImageCache {
    private var images: [String: String] = [:]

    func store(_ image: String, for key: String) {
        images[key] = image
    }
}

@ImageCacheActor
func warmCache() {
    // runs on the cache actor without an injected instance
}
```

## See Also

- [swift-conc-actor-state](conc-actor-state.md) - instance actors for a single piece of shared state
- [swift-conc-mainactor-isolate](conc-mainactor-isolate.md) - the built-in global actor for the UI

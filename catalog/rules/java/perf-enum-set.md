---
id: java-perf-enum-set
lang: java
prefix: perf
title: "Use EnumSet for sets of enum constants"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [enum, set, bitmask, flags]
  files: ["**/*.java"]
  symbols: [EnumSet]
related: [java-perf-deque-over-stack]
sources:
  - title: "EnumSet API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/EnumSet.html
---
> Represent sets of enum constants with EnumSet instead of HashSet.

## Why

EnumSet is documented as "a specialized Set implementation for use with enum types" whose constants are "represented internally as bit vectors", a representation that is "extremely compact and efficient". The documentation adds that all basic operations "execute in constant time" and are likely "much faster than their HashSet counterparts", because a HashSet boxes each enum and hashes it. EnumSet is the typesafe alternative to traditional int-based bit flags.

## Bad

```java
import java.util.HashSet;
import java.util.Set;

class FeatureFlags {

    enum Feature { SEARCH, EXPORT, IMPORT }

    private final Set<Feature> enabled = new HashSet<>();

    void enable(Feature feature) {
        enabled.add(feature);
    }

    boolean isEnabled(Feature feature) {
        return enabled.contains(feature);
    }
}
```

## Good

```java
import java.util.EnumSet;
import java.util.Set;

class FeatureFlags {

    enum Feature { SEARCH, EXPORT, IMPORT }

    private final Set<Feature> enabled = EnumSet.noneOf(Feature.class);

    void enable(Feature feature) {
        enabled.add(feature);
    }

    boolean isEnabled(Feature feature) {
        return enabled.contains(feature);
    }
}
```

## See Also

- [java-perf-deque-over-stack](perf-deque-over-stack.md) - another specialized collection choice

---
id: java-coll-map-get-or-default
lang: java
prefix: coll
title: "Read map values with a fallback via getOrDefault"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [map, getordefault, fallback, default]
  files: ["**/*.java"]
  symbols: [Map.getOrDefault]
related: [java-coll-map-merge]
sources:
  - title: "Map API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Map.html
---
> Ask for the fallback in one call instead of branching around containsKey.

## Why

Map.getOrDefault "returns the value to which the specified key is mapped, or defaultValue if this map contains no mapping for the key". A containsKey branch followed by get performs two lookups and splits one decision across two statements, so the default can drift from the check when the code is edited; the single call keeps the fallback next to the lookup.

## Bad

```java
import java.util.Map;

class Settings {
    String theme(Map<String, String> values) {
        if (values.containsKey("theme")) {
            return values.get("theme");
        }
        return "light";
    }
}
```

## Good

```java
import java.util.Map;

class Settings {
    String theme(Map<String, String> values) {
        return values.getOrDefault("theme", "light");
    }
}
```

## See Also

- [java-coll-map-merge](coll-map-merge.md) - updating values with the same convenience

---
id: java-coll-set-membership
lang: java
prefix: coll
title: "Use a Set for membership tests, not a List"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [set, membership, contains, hashset]
  files: ["**/*.java"]
  symbols: [HashSet, Set]
related: [java-coll-map-get-or-default]
sources:
  - title: "HashSet API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/HashSet.html
  - title: "List API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/List.html
---
> Represent membership with a Set; List.contains scans and can hide duplicates.

## Why

HashSet "offers constant time performance for the basic operations (add, remove, contains and size), assuming the hash function disperses the elements properly among the buckets", while the List documentation cautions that its search methods "should be used with caution. In many implementations they will perform costly linear searches". A list used as a lookup table also admits duplicates, so the same value can be stored several times without changing the answers.

## Bad

```java
import java.util.List;

class Allowlist {
    boolean allowed(List<String> names, String candidate) {
        return names.contains(candidate);
    }
}
```

## Good

```java
import java.util.Set;

class Allowlist {
    boolean allowed(Set<String> names, String candidate) {
        return names.contains(candidate);
    }
}
```

## See Also

- [java-coll-map-get-or-default](coll-map-get-or-default.md) - the keyed lookup counterpart

---
id: java-anti-list-of-null
lang: java
prefix: anti
title: "Do not use List.of for collections that may contain null"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [list, "null", factory, collections]
  files: ["**/*.java"]
  symbols: [List.of]
related: [java-coll-immutable-factory]
sources:
  - title: "Error Prone: DoubleBraceInitialization"
    url: https://errorprone.info/bugpattern/DoubleBraceInitialization
---
> Null elements are data sometimes; the unmodifiable factories reject them.

## Why

Error Prone's DoubleBraceInitialization check includes the tip that "neither the guava immutable collections nor the static factory methods added in a JDK 9 support null elements" and suggests using Arrays.asList when a list must carry nulls. List.of throws NullPointerException at creation time, so a factory chosen for its immutability turns a legal null value into a crash at the call site.

## Bad

```java
import java.util.List;

class Row {
    List<String> values(String maybeNull) {
        return List.of("id", maybeNull);
    }
}
```

## Good

```java
import java.util.Arrays;
import java.util.List;

class Row {
    List<String> values(String maybeNull) {
        return Arrays.asList("id", maybeNull);
    }
}
```

## See Also

- [java-coll-immutable-factory](coll-immutable-factory.md) - when the factory is the right choice

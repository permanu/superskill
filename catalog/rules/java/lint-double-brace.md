---
id: java-lint-double-brace
lang: java
prefix: lint
title: "Avoid double-brace initialization"
severity: should
enforce: tool
tool: "errorprone:DoubleBraceInitialization"
baseline: latest
status: verified
triggers:
  keywords: [collections, initialization, anonymous-class]
  files: ["**/*.java"]
  symbols: [DoubleBraceInitialization]
related: [java-coll-immutable-factory]
sources:
  - title: "Error Prone: DoubleBraceInitialization"
    url: https://errorprone.info/bugpattern/DoubleBraceInitialization
---
> Use List.of/Set.of/Map.of instead of an anonymous class with an initializer block.

## Why

Error Prone's DoubleBraceInitialization check says the pattern "should be avoided—especially in non-static contexts" because "inner classes in a non-static context are terrific sources of memory leaks! If you pass the collection somewhere that retains it, the entire instance you created it from can no longer be garbage collected." The check points to the `List.of`, `Set.of`, and `Map.of` factories as the alternative.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Roles {
    List<String> defaults() {
        return new ArrayList<String>() {{
            add("reader");
            add("writer");
        }};
    }
}
```

## Good

```java
import java.util.List;

class Roles {
    List<String> defaults() {
        return List.of("reader", "writer");
    }
}
```

## See Also

- [java-coll-immutable-factory](coll-immutable-factory.md) - the factory methods this check recommends

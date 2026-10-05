---
id: java-api-static-factory
lang: java
prefix: api
title: "Offer static factories instead of public constructors"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [factory, constructor, api, caching]
  files: ["**/*.java"]
  symbols: [Integer.valueOf, List.of]
related: [java-lint-deprecation-clean]
sources:
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Let callers obtain instances through named factories, not public constructors.

## Why

The Integer documentation explains why its factory replaced the constructor: "if a new Integer instance is not required, this method should generally be used in preference to the constructor Integer(int), as this method is likely to yield significantly better space and time performance by caching frequently requested values." Factories can cache, return subtypes, and carry descriptive names; a public constructor commits the class to one representation and one construction path.

## Bad

```java
import java.util.List;

class Names {
    private final List<String> values;

    public Names(List<String> values) {
        this.values = List.copyOf(values);
    }
}
```

## Good

```java
import java.util.List;

class Names {
    private final List<String> values;

    private Names(List<String> values) {
        this.values = List.copyOf(values);
    }

    static Names of(String... values) {
        return new Names(List.of(values));
    }
}
```

## See Also

- [java-lint-deprecation-clean](lint-deprecation-clean.md) - migrating callers off deprecated constructors

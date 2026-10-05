---
id: java-opt-filter
lang: java
prefix: opt
title: "Express presence conditions with filter()"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, filter, predicate, condition]
  files: ["**/*.java"]
  symbols: [Optional.filter]
related: [java-opt-if-present-else]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Keep Optional.empty() as the failure result; filter() applies the condition in the chain.

## Why

filter "returns an Optional describing the value" when the predicate matches, "otherwise returns an empty Optional". An isPresent-and-get guard that returns Optional.empty() by hand duplicates that rule and unwraps the value only to re-wrap it, so the same condition has to be maintained in two shapes.

## Bad

```java
import java.util.Optional;

class Login {
    Optional<String> admin(Optional<String> role) {
        if (role.isPresent() && role.get().equals("admin")) {
            return role;
        }
        return Optional.empty();
    }
}
```

## Good

```java
import java.util.Optional;

class Login {
    Optional<String> admin(Optional<String> role) {
        return role.filter("admin"::equals);
    }
}
```

## See Also

- [java-opt-if-present-else](opt-if-present-else.md) - branching once the condition is applied

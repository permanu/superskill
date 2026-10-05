---
id: java-opt-if-present-else
lang: java
prefix: opt
title: "Branch on presence with ifPresentOrElse"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, ifpresentorelse, branch, consumer]
  files: ["**/*.java"]
  symbols: [Optional.ifPresentOrElse]
related: [java-opt-filter]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Use ifPresentOrElse for both branches; it carries the value without a get() call.

## Why

ifPresentOrElse "performs the given action with the value" when present, "otherwise performs the given empty-based action". The isPresent/else form forces a separate get() inside the present branch; ifPresentOrElse hands the value to the consumer directly, so the present and empty paths cannot get out of sync and no unchecked unwrap is needed.

## Bad

```java
import java.util.Optional;

class Audit {
    void record(Optional<String> user) {
        if (user.isPresent()) {
            System.out.println("user " + user.get());
        } else {
            System.out.println("anonymous");
        }
    }
}
```

## Good

```java
import java.util.Optional;

class Audit {
    void record(Optional<String> user) {
        user.ifPresentOrElse(
                name -> System.out.println("user " + name),
                () -> System.out.println("anonymous"));
    }
}
```

## See Also

- [java-opt-filter](opt-filter.md) - expressing the condition before the branch

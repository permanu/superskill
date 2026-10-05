---
id: java-opt-return-type-only
lang: java
prefix: opt
title: "Use Optional for return values, not for fields or parameters"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [optional, return-type, field, parameter]
  files: ["**/*.java"]
  symbols: [Optional]
related: [java-opt-never-null, java-err-optional-return]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Optional is a return-type tool; fields and parameters should use plain types.

## Why

The Optional API note says the class "is primarily intended for use as a method return type where there is a clear need to represent 'no result,' and where using null is likely to cause errors". An Optional field or parameter adds a second empty state — the Optional itself can be null — and forces every accessor to unwrap instead of exposing the value directly; the absence is better represented once, at the boundary that returns it.

## Bad

```java
import java.util.Optional;

class User {
    private Optional<String> nickname = Optional.empty();
}
```

## Good

```java
import java.util.Optional;

class User {
    private String nickname;

    Optional<String> nickname() {
        return Optional.ofNullable(nickname);
    }
}
```

## See Also

- [java-opt-never-null](opt-never-null.md) - the null contract for the Optional itself
- [java-err-optional-return](err-optional-return.md) - the finder-method case this rule builds on

---
id: java-err-optional-return
lang: java
prefix: err
title: "Return Optional from finders instead of a null that callers forget to check"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [Optional, "null", find, absence, return]
  files: ["**/*.java"]
  symbols: [Optional, findFirst]
related: [java-err-fail-fast-args]
sources:
  - title: "Optional API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/Optional.html
---
> Return Optional from a finder when absence is a normal result; never return a bare null.

## Why

Optional's API note defines its purpose: it is "primarily intended for use as a method return type where there is a clear need to represent 'no result,' and where using null is likely to cause errors". A null return makes absence invisible in the signature, so callers discover it as a NullPointerException far from the finder. Optional moves that case into the type and forces the caller to choose a value, a default, or an exception.

## Bad

```java
import java.util.List;

class UserDirectory {
    User find(String name) {
        for (User user : List.of(new User("ada"), new User("grace"))) {
            if (user.name().equals(name)) {
                return user;
            }
        }
        return null;
    }

    record User(String name) {
    }
}
```

## Good

```java
import java.util.List;
import java.util.Optional;

class UserDirectory {
    Optional<User> find(String name) {
        return List.of(new User("ada"), new User("grace")).stream()
                .filter(user -> user.name().equals(name))
                .findFirst();
    }

    record User(String name) {
    }
}
```

## See Also

- [java-err-fail-fast-args](err-fail-fast-args.md) - the other side of absence: a required value that must never be null

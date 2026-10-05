---
id: java-api-equals-hashcode
lang: java
prefix: api
title: "Override hashCode whenever you override equals"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [equals, hashcode, contract, collection]
  files: ["**/*.java"]
  symbols: [Object.equals, Object.hashCode]
related: [java-api-tostring, java-api-comparable-consistent]
sources:
  - title: "Object API: equals and hashCode"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Object.html
---
> Keep equals and hashCode paired so equal objects land in the same hash bucket.

## Why

Object's API note states that "it is generally necessary to override the hashCode method whenever this method is overridden, so as to maintain the general contract for the hashCode method, which states that equal objects must have equal hash codes". An equals-only override leaves two equal values with unrelated identity hash codes, so HashMap and HashSet lookups miss entries that were put with an equal key.

## Bad

```java
class User {
    private final String name;

    User(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof User user && name.equals(user.name);
    }
}
```

## Good

```java
import java.util.Objects;

class User {
    private final String name;

    User(String name) {
        this.name = name;
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof User user && name.equals(user.name);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);
    }
}
```

## See Also

- [java-api-tostring](api-tostring.md) - the third member of the value contract
- [java-api-comparable-consistent](api-comparable-consistent.md) - ordering must agree with equality

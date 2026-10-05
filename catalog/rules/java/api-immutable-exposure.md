---
id: java-api-immutable-exposure
lang: java
prefix: api
title: "Return an unmodifiable copy of internal collections instead of the live list"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [collection, immutable, copy, encapsulation]
  files: ["**/*.java"]
  symbols: [List.copyOf, List.of]
related: [java-api-check-return-value, java-conc-concurrent-collections]
sources:
  - title: "List API: Unmodifiable Lists"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/List.html
---
> Hand callers an unmodifiable snapshot so they cannot mutate the object's internals.

## Why

The List API documents that List.copyOf creates an unmodifiable list whose mutator methods "will always cause UnsupportedOperationException to be thrown". Returning the internal list instead publishes a mutator: any caller can add or remove elements without going through the owning type's methods, so invariants checked on the way in can be bypassed after the fact. A copy also protects the caller from concurrent modification by later internal changes.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Team {
    private final List<String> members = new ArrayList<>();

    void add(String member) {
        members.add(member);
    }

    List<String> members() {
        return members;
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Team {
    private final List<String> members = new ArrayList<>();

    void add(String member) {
        members.add(member);
    }

    List<String> members() {
        return List.copyOf(members);
    }
}
```

## See Also

- [java-api-check-return-value](api-check-return-value.md) - treating returned values as the API's result
- [java-conc-concurrent-collections](conc-concurrent-collections.md) - the thread-safety version of collection choice

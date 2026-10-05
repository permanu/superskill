---
id: java-type-value-based-identity
lang: java
prefix: type
title: "Compare value-based objects by equality, never by identity"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [value-based, identity, equals, synchronization]
  files: ["**/*.java"]
  symbols: [LocalDate, Optional]
related: [java-err-optional-return]
sources:
  - title: "Java SE API: Value-based Classes"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/doc-files/ValueBased.html
---
> Treat equal value-based instances as interchangeable: use equals and never lock on them.

## Why

The Value-based Classes specification states that "when two instances of a value-based class are equal, a program should not attempt to distinguish between their identities, whether directly via reference equality or indirectly via an appeal to synchronization, identity hashing, serialization, or any other identity-sensitive mechanism". Such a program is broken today whenever the instances are distinct objects, and "synchronization may fail" in a future release. Boxed primitives, Optional, and java.time values are all value-based.

## Bad

```java
import java.time.LocalDate;

class Schedule {
    boolean isToday(LocalDate date) {
        return date == LocalDate.now();
    }
}
```

## Good

```java
import java.time.LocalDate;

class Schedule {
    boolean isToday(LocalDate date) {
        return date.equals(LocalDate.now());
    }
}
```

## See Also

- [java-err-optional-return](err-optional-return.md) - Optional is a value-based type returned by finders

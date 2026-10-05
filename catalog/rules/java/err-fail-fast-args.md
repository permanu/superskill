---
id: java-err-fail-fast-args
lang: java
prefix: err
title: "Validate arguments at method entry so the failure points at the caller"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [validate, arguments, "null", precondition, entry]
  files: ["**/*.java"]
  symbols: [Objects.requireNonNull, IllegalArgumentException]
related: [java-err-checked-vs-unchecked, java-err-optional-return]
sources:
  - title: "Java Tutorials: Unchecked Exceptions - The Controversy"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/runtime.html
---
> Reject invalid arguments with an unchecked exception before the method does any work.

## Why

Argument mistakes are programming errors that only the caller can fix. The tutorial records argument checking as the common case for throwing a runtime exception, and an entry check puts the caller's call site at the top of the stack trace instead of an internal line reached after partial work. Validating late means the failure can arrive after state has changed, when the invalid input is no longer visible.

## Bad

```java
import java.util.List;

class Batch {
    void process(List<String> items, int limit) {
        for (int i = 0; i < limit; i++) {
            System.out.println(items.get(i));
        }
    }
}
```

## Good

```java
import java.util.List;
import java.util.Objects;

class Batch {
    void process(List<String> items, int limit) {
        Objects.requireNonNull(items, "items");
        if (limit < 0) {
            throw new IllegalArgumentException("limit must be >= 0: " + limit);
        }
        for (int i = 0; i < limit; i++) {
            System.out.println(items.get(i));
        }
    }
}
```

## See Also

- [java-err-checked-vs-unchecked](err-checked-vs-unchecked.md) - why argument checks are unchecked
- [java-err-optional-return](err-optional-return.md) - representing absence instead of returning null

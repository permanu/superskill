---
id: java-pat-record-inference
lang: java
prefix: pat
title: "Let record patterns infer type arguments"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, pattern, generics, inference]
  files: ["**/*.java"]
  symbols: [instanceof]
related: [java-pat-nested-deconstruction]
sources:
  - title: "JEP 440: Record Patterns"
    url: https://openjdk.org/jeps/440
---
> Write record patterns without type arguments; inference supplies them.

## Why

JEP 440 states that "if a record pattern names a generic record class but gives no type arguments (i.e., the record pattern uses a raw type) then the type arguments are always inferred", so `case MyPair(var fst, var snd)` matches a `MyPair<String, Integer>` with the components correctly typed. Testing the type and then calling accessors instead discards that inference and leaves the components as their erased types.

## Bad

```java
class Pairs {
    String first(Object value) {
        if (value instanceof MyPair<?, ?> pair) {
            return String.valueOf(pair.fst());
        }
        return "";
    }
}

record MyPair<S, T>(S fst, T snd) {
}
```

## Good

```java
class Pairs {
    String first(Object value) {
        if (value instanceof MyPair(var fst, var snd)) {
            return String.valueOf(fst);
        }
        return "";
    }
}

record MyPair<S, T>(S fst, T snd) {
}
```

## See Also

- [java-pat-nested-deconstruction](pat-nested-deconstruction.md) - nesting these patterns further

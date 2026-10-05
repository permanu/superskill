---
id: java-type-record-accessor-override
lang: java
prefix: type
title: "Annotate explicitly declared record accessors with @Override"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, accessor, override, annotation]
  files: ["**/*.java"]
  symbols: [Override]
related: [java-api-override-annotation]
sources:
  - title: "JEP 395: Records"
    url: https://openjdk.org/jeps/395
---
> Keep @Override on hand-written accessors so a renamed component breaks the build.

## Why

JEP 395 notes that "the meaning of the @Override annotation was extended to include the case where the annotated method is an explicitly declared accessor method for a record component". An explicitly declared accessor without @Override still compiles, but renaming the component silently turns the method into an unrelated one instead of a compile-time error, which is exactly what the annotation exists to catch.

## Bad

```java
record Point(int x, int y) {
    public int x() {
        return Math.abs(x);
    }
}
```

## Good

```java
record Point(int x, int y) {
    @Override
    public int x() {
        return Math.abs(x);
    }
}
```

## See Also

- [java-api-override-annotation](api-override-annotation.md) - the general override rule

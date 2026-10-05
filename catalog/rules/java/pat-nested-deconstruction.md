---
id: java-pat-nested-deconstruction
lang: java
prefix: pat
title: "Deconstruct nested records in one pattern"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, pattern, nested, deconstruction]
  files: ["**/*.java"]
  symbols: [instanceof]
related: [java-type-record-pattern]
sources:
  - title: "JEP 440: Record Patterns"
    url: https://openjdk.org/jeps/440
---
> Match nested record structure in a single pattern instead of chaining accessors.

## Why

JEP 440 introduces record patterns so that "record patterns and type patterns can be nested to enable a powerful, declarative, and composable form of data navigation and processing". Accessing a nested component through a chain of accessor calls spreads the shape of the data across several statements and throws away the compiler's knowledge of which components exist; one nested pattern states the whole structure at the match.

## Bad

```java
class Geometry {
    int startX(Object shape) {
        if (shape instanceof Line line) {
            Point start = line.start();
            return start.x();
        }
        return 0;
    }
}

record Point(int x, int y) {
}

record Line(Point start, Point end) {
}
```

## Good

```java
class Geometry {
    int startX(Object shape) {
        if (shape instanceof Line(Point(var x, var y), Point end)) {
            return x;
        }
        return 0;
    }
}

record Point(int x, int y) {
}

record Line(Point start, Point end) {
}
```

## See Also

- [java-type-record-pattern](type-record-pattern.md) - the single-level record pattern

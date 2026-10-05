---
id: java-type-record-pattern
lang: java
prefix: type
title: "Destructure records with record patterns instead of accessor calls"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, pattern, deconstruct, components]
  files: ["**/*.java"]
  symbols: [instanceof]
related: [java-type-pattern-instanceof, java-type-exhaustive-switch]
sources:
  - title: "JEP 440: Record Patterns"
    url: https://openjdk.org/jeps/440
---
> Match record components directly in the pattern so extraction and test stay one operation.

## Why

JEP 440 notes that a pattern variable bound to a record "is used here solely to invoke the accessor methods", and that a record pattern "lifts the declaration of local variables for extracted components into the pattern itself". The single pattern is all-or-nothing: it matches only if the value is the record type and every nested pattern matches, so no component can be read from a value that failed the test.

## Bad

```java
record Point(int x, int y) {
}

class Distances {
    double fromOrigin(Object value) {
        if (value instanceof Point) {
            Point point = (Point) value;
            return Math.hypot(point.x(), point.y());
        }
        return Double.NaN;
    }
}
```

## Good

```java
record Point(int x, int y) {
}

class Distances {
    double fromOrigin(Object value) {
        if (value instanceof Point(int x, int y)) {
            return Math.hypot(x, y);
        }
        return Double.NaN;
    }
}
```

## See Also

- [java-type-pattern-instanceof](type-pattern-instanceof.md) - the type-pattern form this extends
- [java-type-exhaustive-switch](type-exhaustive-switch.md) - record patterns inside exhaustive switches

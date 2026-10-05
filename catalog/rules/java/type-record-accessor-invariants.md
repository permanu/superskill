---
id: java-type-record-accessor-invariants
lang: java
prefix: type
title: "Keep record accessors side-effect free and validate in the constructor"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [record, accessor, invariant, state]
  files: ["**/*.java"]
  symbols: [Record]
related: [java-type-record-data-carrier, java-type-record-validate]
sources:
  - title: "JEP 395: Records"
    url: https://openjdk.org/jeps/395
---
> Return component values unchanged; enforce constraints where the instance is created.

## Why

JEP 395 marks accessor methods that adjust state as "bad style": the copy invariant fails because reconstructing a record from its own accessors no longer equals the original, and the adjustment hides the real state from equals, hashCode, and toString. Validation belongs in the canonical constructor, where it applies once and every accessor then reports the truth.

## Bad

```java
record SmallPoint(int x, int y) {
    public int x() {
        return this.x < 100 ? this.x : 100;
    }

    public int y() {
        return this.y < 100 ? this.y : 100;
    }
}
```

## Good

```java
record SmallPoint(int x, int y) {
    SmallPoint {
        if (x > 100 || y > 100) {
            throw new IllegalArgumentException("point out of bounds");
        }
    }
}
```

## See Also

- [java-type-record-data-carrier](type-record-data-carrier.md) - the value-equality contract accessors must respect
- [java-type-record-validate](type-record-validate.md) - where the bounds check belongs

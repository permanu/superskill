---
id: java-num-nan-test
lang: java
prefix: num
title: "Test NaN with Double.isNaN, never with equality"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nan, isnan, floating-point, comparison]
  files: ["**/*.java"]
  symbols: [Double.isNaN]
related: [java-num-double-equality]
sources:
  - title: "Double API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Double.html
---
> Ask isNaN; a NaN is not equal to any value, including itself.

## Why

The Double class documentation states: "If v1 and v2 are both NaN, then v1 == v2 has the value false. Therefore, for two NaN arguments the reflexive property of an equivalence relation is not satisfied by the == operator." It adds that a NaN "is neither less than, nor greater than, nor equal to any value, including itself". A NaN check written as value == Double.NaN therefore never fires, and the failure propagates as bad data instead of being handled.

## Bad

```java
class Reading {
    boolean isMissing(double value) {
        return value == Double.NaN;
    }
}
```

## Good

```java
class Reading {
    boolean isMissing(double value) {
        return Double.isNaN(value);
    }
}
```

## See Also

- [java-num-double-equality](num-double-equality.md) - the broader equality trap for computed values

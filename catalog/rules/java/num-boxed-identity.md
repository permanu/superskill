---
id: java-num-boxed-identity
lang: java
prefix: num
title: "Compare boxed numbers with equals, not reference equality"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [boxing, integer, identity, equals]
  files: ["**/*.java"]
  symbols: [Integer.valueOf]
related: [java-num-double-equality]
sources:
  - title: "Integer API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Integer.html
---
> Use equals or compare for Integer values; == depends on an implementation cache.

## Why

The Integer.valueOf documentation says the method "will always cache values in the range -128 to 127, inclusive, and may cache other values outside of this range". Two boxed values that are numerically equal therefore compare equal with == only while they fall inside the cache; outside it, == reports false for values that equals treats as the same number. Numeric equality must be expressed with equals or Integer.compare.

## Bad

```java
class Limits {
    boolean same(int first, int second) {
        Integer left = first;
        Integer right = second;
        return left == right;
    }
}
```

## Good

```java
class Limits {
    boolean same(int first, int second) {
        Integer left = first;
        Integer right = second;
        return left.equals(right);
    }
}
```

## See Also

- [java-num-double-equality](num-double-equality.md) - the floating-point variant of the same mistake

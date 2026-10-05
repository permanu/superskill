---
id: java-num-to-int-exact
lang: java
prefix: num
title: "Narrow long to int with Math.toIntExact, not a cast"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [narrowing, cast, overflow, tointexact]
  files: ["**/*.java"]
  symbols: [Math.toIntExact]
related: [java-num-overflow-exact]
sources:
  - title: "Math API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Math.html
---
> Convert a long that must fit an int with toIntExact; a cast keeps only the low 32 bits.

## Why

Math.toIntExact "returns the value of the long argument, throwing an exception if the value overflows an int". A narrowing cast silently truncates to the low 32 bits, turning a value like 4_294_967_296 into 0; when the conversion is expected to be lossless, the Exact method makes the failure visible at the point of conversion.

## Bad

```java
class Sizes {
    int asInt(long value) {
        return (int) value;
    }
}
```

## Good

```java
class Sizes {
    int asInt(long value) {
        return Math.toIntExact(value);
    }
}
```

## See Also

- [java-num-overflow-exact](num-overflow-exact.md) - the arithmetic counterpart

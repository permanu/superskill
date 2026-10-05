---
id: java-num-floor-mod
lang: java
prefix: num
title: "Wrap negative indexes with Math.floorMod, not %"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [modulo, negative, index, wrapping]
  files: ["**/*.java"]
  symbols: [Math.floorMod]
related: [java-num-overflow-exact]
sources:
  - title: "Math API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Math.html
---
> Use floorMod for cyclic indexes so a negative position still maps into range.

## Why

Math.floorMod returns a remainder that "has the same sign as the divisor y or is zero", so floorMod(-1, 7) is 6. The % operator keeps the sign of the dividend, so the same expression yields -1 — an out-of-range index that fails only at the point of array or list access. Whenever the divisor is positive and the value can be negative, floorMod is the operation that matches cyclic intent.

## Bad

```java
class Ring {
    int index(int position, int size) {
        return position % size;
    }
}
```

## Good

```java
class Ring {
    int index(int position, int size) {
        return Math.floorMod(position, size);
    }
}
```

## See Also

- [java-num-overflow-exact](num-overflow-exact.md) - another arithmetic edge that fails silently

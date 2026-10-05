---
id: java-gen-wildcard-pecs
lang: java
prefix: gen
title: "Choose extends or super wildcards from the data flow direction"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [wildcard, extends, super, variance]
  files: ["**/*.java"]
  symbols: [List]
related: [java-gen-unbounded-wildcard, java-gen-wildcard-return]
sources:
  - title: "Java Tutorials: Guidelines for Wildcard Use"
    url: https://docs.oracle.com/javase/tutorial/java/generics/wildcardGuidelines.html
---
> Use an extends wildcard for values you only read and a super wildcard for values you only write.

## Why

The Guidelines for Wildcard Use page defines the rule: "An 'in' variable is defined with an upper bounded wildcard, using the extends keyword. An 'out' variable is defined with a lower bounded wildcard, using the super keyword... In the case where the code needs to access the variable as both an 'in' and an 'out' variable, do not use a wildcard." A parameter typed List<Number> rejects a List<Integer> even though every Integer is a Number, because generic types are invariant.

## Bad

```java
import java.util.List;

class Sum {
    static double total(List<Number> values) {
        double sum = 0;
        for (Number value : values) {
            sum += value.doubleValue();
        }
        return sum;
    }
}
```

## Good

```java
import java.util.List;

class Sum {
    static double total(List<? extends Number> values) {
        double sum = 0;
        for (Number value : values) {
            sum += value.doubleValue();
        }
        return sum;
    }
}
```

## See Also

- [java-gen-unbounded-wildcard](gen-unbounded-wildcard.md) - the wildcard for Object-level use
- [java-gen-wildcard-return](gen-wildcard-return.md) - why the guidelines stop at return types

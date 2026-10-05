---
id: java-anti-equals-incompatible
lang: java
prefix: anti
title: "Do not compare objects of incompatible types with equals"
severity: must
enforce: tool
tool: "errorprone:EqualsIncompatibleType"
baseline: latest
status: verified
triggers:
  keywords: [equals, types, comparison, bug]
  files: ["**/*.java"]
  symbols: [EqualsIncompatibleType]
related: [java-anti-reference-equality]
sources:
  - title: "Error Prone: EqualsIncompatibleType"
    url: https://errorprone.info/bugpattern/EqualsIncompatibleType
---
> equals accepts any Object, so unrelated types compile and always return false.

## Why

Error Prone's EqualsIncompatibleType check observes that "no Integer will be equal to any String. However, the signature of the equals method accepts any Object, so the compiler will happily allow us to pass an Integer to the equals method. That method will always return false". The comparison compiles and silently reports "not equal" forever, so a branch keyed on it never fires.

## Bad

```java
class Check {
    boolean isAnswer(String label, Integer value) {
        return label.equals(value);
    }
}
```

## Good

```java
class Check {
    boolean isAnswer(String label, Integer value) {
        return label.equals(value.toString());
    }
}
```

## See Also

- [java-anti-reference-equality](anti-reference-equality.md) - the other way equals goes wrong

---
id: java-gen-safevarargs
lang: java
prefix: gen
title: "Mark provably safe generic varargs with @SafeVarargs"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [safevarargs, varargs, heap-pollution, unchecked]
  files: ["**/*.java"]
  symbols: [SafeVarargs]
related: [java-gen-suppress-scope, java-gen-no-parameterized-arrays]
sources:
  - title: "SafeVarargs API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/SafeVarargs.html
---
> Annotate generic varargs methods whose body never leaks the array; the warning is real without the assertion.

## Why

The SafeVarargs documentation calls the annotation "a programmer assertion that the body of the annotated method or constructor does not perform potentially unsafe operations on its varargs parameter", and notes that it "suppresses unchecked warnings about a non-reifiable variable arity (vararg) type and suppresses unchecked warnings about parameterized array creation at call sites". The compiler requires such methods to be static, final, or private so the assertion cannot be invalidated by overriding; annotate only when the body truly does not store into or leak the array.

## Bad

```java
import java.util.List;

class Lists {
    static <T> List<T> of(T... elements) {
        return List.of(elements);
    }
}
```

## Good

```java
import java.util.List;

class Lists {
    @SafeVarargs
    static <T> List<T> of(T... elements) {
        return List.of(elements);
    }
}
```

## See Also

- [java-gen-suppress-scope](gen-suppress-scope.md) - the general suppression rule
- [java-gen-no-parameterized-arrays](gen-no-parameterized-arrays.md) - why the varargs array is non-reifiable

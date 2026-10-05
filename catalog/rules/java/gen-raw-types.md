---
id: java-gen-raw-types
lang: java
prefix: gen
title: "Avoid raw types for generic classes and interfaces"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [raw-type, generics, unchecked, warning]
  files: ["**/*.java"]
  symbols: [List, Map]
related: [java-gen-generic-parameters, java-gen-suppress-scope]
sources:
  - title: "Java Tutorials: Raw Types"
    url: https://docs.oracle.com/javase/tutorial/java/generics/rawTypes.html
---
> Name the type arguments; raw types bypass generic checks and defer failures to runtime.

## Why

The Raw Types page explains that "raw types bypass generic type checks, deferring the catch of unsafe code to runtime" and concludes "Therefore, you should avoid using raw types." Assigning a raw type to a parameterized one produces an unchecked conversion warning precisely because the compiler can no longer guarantee the element types, so a wrong element only surfaces as a ClassCastException later.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

class Names {
    List names = new ArrayList();

    void add(String name) {
        names.add(name);
    }
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Names {
    List<String> names = new ArrayList<>();

    void add(String name) {
        names.add(name);
    }
}
```

## See Also

- [java-gen-generic-parameters](gen-generic-parameters.md) - introducing the type parameter in the first place
- [java-gen-suppress-scope](gen-suppress-scope.md) - when legacy boundaries force an unchecked warning

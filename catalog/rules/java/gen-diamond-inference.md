---
id: java-gen-diamond-inference
lang: java
prefix: gen
title: "Use the diamond operator instead of repeating type arguments"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [diamond, type-inference, constructor, generics]
  files: ["**/*.java"]
  symbols: [HashMap]
related: [java-gen-raw-types]
sources:
  - title: "Java Tutorials: Type Inference"
    url: https://docs.oracle.com/javase/tutorial/java/generics/genTypeInference.html
---
> Let the compiler infer constructor type arguments with <>; repeating them adds noise that can drift.

## Why

The Type Inference page explains that "you can replace the type arguments required to invoke the constructor of a generic class with an empty set of type parameters (<>) as long as the compiler can infer the type arguments from the context" — this pair of brackets is informally called the diamond. Repeating the arguments by hand duplicates the declaration, so changing the variable's type leaves two places to edit and invites a mismatch.

## Bad

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Registry {
    Map<String, List<String>> index = new HashMap<String, List<String>>();
}
```

## Good

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

class Registry {
    Map<String, List<String>> index = new HashMap<>();
}
```

## See Also

- [java-gen-raw-types](gen-raw-types.md) - the other way constructor type arguments get lost

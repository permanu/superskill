---
id: java-gen-suppress-scope
lang: java
prefix: gen
title: "Scope @SuppressWarnings to the smallest element that needs it"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [suppresswarnings, unchecked, warnings, scope]
  files: ["**/*.java"]
  symbols: [SuppressWarnings]
related: [java-gen-raw-types, java-gen-safevarargs]
sources:
  - title: "SuppressWarnings API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/SuppressWarnings.html
---
> Suppress unchecked warnings on the narrowest declaration; a class-level annotation hides future warnings.

## Why

The SuppressWarnings documentation instructs: "As a matter of style, programmers should always use this annotation on the most deeply nested element where it is effective. For example, if you want to suppress a warning in a particular method, you should annotate that method rather than its class." Suppression applies to the annotated element "and in all elements contained in the annotated element", so a class-level annotation also silences new warnings in unrelated members.

## Bad

```java
import java.util.ArrayList;
import java.util.List;

@SuppressWarnings("unchecked")
class Cache {
    List<String> values = (List<String>) (List<?>) new ArrayList<Object>();
}
```

## Good

```java
import java.util.ArrayList;
import java.util.List;

class Cache {
    @SuppressWarnings("unchecked")
    List<String> values = (List<String>) (List<?>) new ArrayList<Object>();
}
```

## See Also

- [java-gen-raw-types](gen-raw-types.md) - the unchecked conversion that needs suppressing
- [java-gen-safevarargs](gen-safevarargs.md) - the dedicated annotation for one unchecked case

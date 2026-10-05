---
id: java-proj-internal-api
lang: java
prefix: proj
title: "Do not depend on JDK-internal APIs"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [internal-api, encapsulation, reflection, jdk]
  files: ["**/*.java"]
  symbols: [String]
related: [java-proj-service-loader]
sources:
  - title: "JEP 403: Strongly Encapsulate JDK Internals"
    url: https://openjdk.org/jeps/403
---
> Reach only exported APIs; JDK internals are strongly encapsulated and cannot be opened at scale.

## Why

JEP 403 states its goal plainly: "Strongly encapsulate all internal elements of the JDK, except for critical internal APIs such as sun.misc.Unsafe. It will no longer be possible to relax the strong encapsulation of internal elements via a single command-line option, as was possible in JDK 9 through JDK 16." Reflection into a JDK-internal member now fails with InaccessibleObjectException unless the deployment ships per-package --add-opens flags, which are fragile and unsupported.

## Bad

```java
import java.lang.reflect.Field;

class Internals {
    Object peek(String value) throws Exception {
        Field field = String.class.getDeclaredField("value");
        field.setAccessible(true);
        return field.get(value);
    }
}
```

## Good

```java
class Internals {
    char[] chars(String value) {
        return value.toCharArray();
    }
}
```

## See Also

- [java-proj-service-loader](proj-service-loader.md) - the supported way to reach implementations

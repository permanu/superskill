---
id: java-ann-getdeclaredmethod
lang: java
prefix: ann
title: "Choose getMethod and getDeclaredMethod by visibility"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reflection, method, visibility, lookup]
  files: ["**/*.java"]
  symbols: [Class.getMethod, Class.getDeclaredMethod]
related: [java-ann-invocation-target]
sources:
  - title: "Class API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Class.html
---
> getMethod sees public members; getDeclaredMethod sees the class's own members at any access level.

## Why

The Class documentation distinguishes the two lookups: getMethod "returns a Method object that reflects the specified public member method of the class or interface", while getDeclaredMethod "returns a Method object that reflects the specified declared method ... including public, protected, default (package) access, and private methods, but excluding inherited methods". Reaching for getMethod to find a private or package-private helper fails with NoSuchMethodException even though the method exists.

## Bad

```java
import java.lang.reflect.Method;

class Lookup {
    Method declared(Class<?> type) throws NoSuchMethodException {
        return type.getMethod("compute");
    }
}
```

## Good

```java
import java.lang.reflect.Method;

class Lookup {
    Method declared(Class<?> type) throws NoSuchMethodException {
        return type.getDeclaredMethod("compute");
    }
}
```

## See Also

- [java-ann-invocation-target](ann-invocation-target.md) - handling what the invoked method throws

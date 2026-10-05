---
id: java-mem-classvalue
lang: java
prefix: mem
title: "Use ClassValue for per-class derived values"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [classvalue, cache, reflection, class]
  files: ["**/*.java"]
  symbols: [ClassValue]
related: [java-mem-weak-cache]
sources:
  - title: "ClassValue API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/ClassValue.html
---
> Cache values per class with ClassValue: lazy computation, atomic installation, no external map.

## Why

ClassValue is documented as a way to "lazily associate a computed value with (potentially) every type", with the value's "actual installation ... performed atomically" so racing threads agree on one value, and with remove() for the rare invalidation case. A Map<Class<?>, T> needs its own synchronization, invalidation, and cleanup; ClassValue computes on first access and hands the lifecycle to the runtime.

## Bad

```java
import java.util.HashMap;
import java.util.Map;

class TypeNames {

    private final Map<Class<?>, String> names = new HashMap<>();

    synchronized String nameOf(Class<?> type) {
        return names.computeIfAbsent(type, Class::getSimpleName);
    }
}
```

## Good

```java
class TypeNames {

    private final ClassValue<String> names = new ClassValue<>() {
        @Override
        protected String computeValue(Class<?> type) {
            return type.getSimpleName();
        }
    };

    String nameOf(Class<?> type) {
        return names.get(type);
    }
}
```

## See Also

- [java-mem-weak-cache](mem-weak-cache.md) - the per-object cache counterpart

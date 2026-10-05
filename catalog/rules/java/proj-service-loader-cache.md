---
id: java-proj-service-loader-cache
lang: java
prefix: proj
title: "Do not cache ServiceLoader instances VM-wide"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [service-loader, cache, classloader, leak]
  files: ["**/*.java"]
  symbols: [ServiceLoader]
related: [java-proj-service-loader]
sources:
  - title: "ServiceLoader API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ServiceLoader.html
---
> Create a service loader per lookup; a shared static loader leaks providers and is not thread-safe.

## Why

The ServiceLoader.load(Class) API note states that "service loader objects obtained with this method should not be cached VM-wide. For example, different applications in the same VM may have different thread context class loaders. A lookup by one application may locate a service provider that is only visible via its thread context class loader and so is not suitable to be located by the other application. Memory leaks can also arise." The class documentation adds that instances "are not safe for use by multiple concurrent threads", so a static shared loader is wrong on two counts.

## Bad

```java
import java.sql.Driver;
import java.util.ServiceLoader;

class DriverRegistry {
    private static final ServiceLoader<Driver> LOADER = ServiceLoader.load(Driver.class);

    Driver first() {
        return LOADER.findFirst().orElseThrow();
    }
}
```

## Good

```java
import java.sql.Driver;
import java.util.ServiceLoader;

class DriverRegistry {
    Driver first() {
        return ServiceLoader.load(Driver.class).findFirst().orElseThrow();
    }
}
```

## See Also

- [java-proj-service-loader](proj-service-loader.md) - the lookup this rule constrains

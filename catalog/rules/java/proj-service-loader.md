---
id: java-proj-service-loader
lang: java
prefix: proj
title: "Load implementations through ServiceLoader, not hardcoded classes"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [service-loader, plugin, spi, decoupling]
  files: ["**/*.java"]
  symbols: [ServiceLoader]
related: [java-proj-service-loader-cache, java-proj-module-uses]
sources:
  - title: "ServiceLoader API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ServiceLoader.html
---
> Let ServiceLoader discover implementations; callers should refer to the service, not a concrete provider.

## Why

The ServiceLoader documentation describes it as "a facility to load implementations of a service", where "application code refers only to the service, not to service providers, and is assumed to be capable of choosing between multiple service providers ... and handling the possibility that no service providers are located". Instantiating a known implementation by name couples the caller to one provider and breaks as soon as the deployment wants to substitute another.

## Bad

```java
import java.sql.Driver;

class Drivers {
    Driver load() throws Exception {
        Class<?> type = Class.forName("com.example.Driver");
        return (Driver) type.getDeclaredConstructor().newInstance();
    }
}
```

## Good

```java
import java.sql.Driver;
import java.util.ServiceLoader;

class Drivers {
    Driver load() {
        return ServiceLoader.load(Driver.class).findFirst().orElseThrow();
    }
}
```

## See Also

- [java-proj-service-loader-cache](proj-service-loader-cache.md) - why the loader instance must not be cached VM-wide
- [java-proj-module-uses](proj-module-uses.md) - the module declaration a named module needs

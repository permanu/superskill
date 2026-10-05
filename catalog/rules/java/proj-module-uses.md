---
id: java-proj-module-uses
lang: java
prefix: proj
title: "Declare uses for services a named module loads"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [module, uses, serviceloader, spi]
  files: ["**/*.java"]
  symbols: [ServiceLoader]
related: [java-proj-service-loader]
sources:
  - title: "ServiceLoader API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/util/ServiceLoader.html
---
> A named module must declare uses for each service it loads with ServiceLoader.

## Why

The ServiceLoader documentation states that "if the application is a module, then its module declaration must have a uses directive that specifies the service; this helps to locate providers and ensure they will execute reliably". An explicit module that calls ServiceLoader.load without the directive fails with ServiceConfigurationError, because the module system never resolves the providers that should be visible to it.

## Bad

```java
module com.example.app {
    requires java.sql;
}
```

## Good

```java
module com.example.app {
    requires java.sql;
    uses java.sql.Driver;
}
```

## See Also

- [java-proj-service-loader](proj-service-loader.md) - the lookup this directive accompanies

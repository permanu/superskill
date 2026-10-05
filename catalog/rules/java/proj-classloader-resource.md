---
id: java-proj-classloader-resource
lang: java
prefix: proj
title: "Load resources from the classpath, not the working directory"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [resource, classpath, classloader, jar]
  files: ["**/*.java"]
  symbols: [Class.getResourceAsStream]
related: [java-proj-named-package]
sources:
  - title: "Class API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Class.html
---
> Read bundled resources through the class loader so they work from JARs, modules, and any working directory.

## Why

The Class.getResourceAsStream documentation says that "the rules for searching resources associated with a given class are implemented by the defining class loader of the class" and that the method delegates to that loader; a name beginning with "/" is resolved as an absolute resource name. A FileInputStream path is resolved against the process working directory instead, so the same code finds the file during development and misses it when the application is launched from another directory or packaged in a JAR.

## Bad

```java
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

class Banner {
    InputStream open() throws IOException {
        return new FileInputStream("config/banner.txt");
    }
}
```

## Good

```java
import java.io.InputStream;

class Banner {
    InputStream open() {
        return Banner.class.getResourceAsStream("/config/banner.txt");
    }
}
```

## See Also

- [java-proj-named-package](proj-named-package.md) - where the resource's package structure comes from

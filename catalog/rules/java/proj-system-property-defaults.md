---
id: java-proj-system-property-defaults
lang: java
prefix: proj
title: "Read configuration properties with an explicit default"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [system-property, configuration, default]
  files: ["**/*.java"]
  symbols: [System.getProperty]
sources:
  - title: "System API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/System.html
---
> Ask getProperty for the fallback in the same call instead of null-checking the result.

## Why

System.getProperty(String, String) "returns the string value of the system property, or the default value if there is no property with that key", while the single-argument form returns null when the property is absent. Pairing the lookup with its default keeps the fallback visible at the read site and stops a null from escaping into code that assumed configuration was always present.

## Bad

```java
class Settings {
    static String mode() {
        String mode = System.getProperty("app.mode");
        if (mode == null) {
            mode = "production";
        }
        return mode;
    }
}
```

## Good

```java
class Settings {
    static String mode() {
        return System.getProperty("app.mode", "production");
    }
}
```

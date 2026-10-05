---
id: java-ann-runtime-retention
lang: java
prefix: ann
title: "Give reflectively read annotations RUNTIME retention"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [annotation, retention, reflection, runtime]
  files: ["**/*.java"]
  symbols: [Retention, RetentionPolicy]
related: [java-ann-source-retention]
sources:
  - title: "Retention API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/annotation/Retention.html
  - title: "RetentionPolicy API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/annotation/RetentionPolicy.html
---
> Annotations read at run time need @Retention(RUNTIME); the default drops them.

## Why

The Retention documentation warns that "if no Retention annotation is present on an annotation interface declaration, the retention policy defaults to RetentionPolicy.CLASS", and RetentionPolicy defines RUNTIME as "annotations are to be recorded in the class file by the compiler and retained by the VM at run time, so they may be read reflectively". An annotation that is meant to be discovered by reflection but left at the default simply is not there when the code asks.

## Bad

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@interface Audited {
}
```

## Good

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@interface Audited {
}
```

## See Also

- [java-ann-source-retention](ann-source-retention.md) - the other end of the policy range

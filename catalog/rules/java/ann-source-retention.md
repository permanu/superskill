---
id: java-ann-source-retention
lang: java
prefix: ann
title: "Use SOURCE retention for build-time-only annotations"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [annotation, retention, source, tooling]
  files: ["**/*.java"]
  symbols: [RetentionPolicy.SOURCE]
related: [java-ann-runtime-retention]
sources:
  - title: "RetentionPolicy API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/annotation/RetentionPolicy.html
---
> Keep annotations that only tooling reads out of the class file.

## Why

RetentionPolicy defines SOURCE as "annotations are to be discarded by the compiler", while RUNTIME keeps them "recorded in the class file by the compiler and retained by the VM at run time". An annotation that only a checker or generator consumes has no reason to travel into every class file and become visible to reflection; SOURCE states that boundary and keeps the runtime metadata surface honest.

## Bad

```java
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
@interface Generated {
}
```

## Good

```java
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.SOURCE)
@interface Generated {
}
```

## See Also

- [java-ann-runtime-retention](ann-runtime-retention.md) - when runtime reflection is the point

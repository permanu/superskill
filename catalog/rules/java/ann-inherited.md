---
id: java-ann-inherited
lang: java
prefix: ann
title: "Mark class annotations @Inherited when subclasses should see them"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [annotation, inherited, subclass, meta-annotation]
  files: ["**/*.java"]
  symbols: [Inherited]
related: [java-ann-runtime-retention]
sources:
  - title: "Inherited API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/annotation/Inherited.html
---
> Use @Inherited so a superclass annotation answers for its subclasses.

## Why

The Inherited documentation states that when the meta-annotation "is present on an annotation interface declaration, and the user queries the annotation interface on a class declaration, and the class declaration has no annotation for this interface, then the class's superclass will automatically be queried". Framework code that looks for a marker on a subclass only finds it when the annotation declares @Inherited; otherwise each subclass has to repeat it.

## Bad

```java
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Retention(RetentionPolicy.RUNTIME)
@interface Reviewed {
}

@Reviewed
class Base {
}

class Child extends Base {
}
```

## Good

```java
import java.lang.annotation.Inherited;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;

@Inherited
@Retention(RetentionPolicy.RUNTIME)
@interface Reviewed {
}

@Reviewed
class Base {
}

class Child extends Base {
}
```

## See Also

- [java-ann-runtime-retention](ann-runtime-retention.md) - the retention the lookup depends on

---
id: java-api-no-finalize
lang: java
prefix: api
title: "Never override finalize; release resources with close() or Cleaner"
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [finalize, cleanup, autocloseable, cleaner]
  files: ["**/*.java"]
  symbols: [Object.finalize, AutoCloseable]
related: [java-err-try-with-resources]
sources:
  - title: "Object API: finalize"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/Object.html
  - title: "Google Java Style Guide, section 6.4: Finalizers"
    url: https://google.github.io/styleguide/javaguide.html#s6.4-finalizers
---
> Use close() with try-with-resources or a Cleaner; finalize is deprecated for removal.

## Why

Object.finalize is deprecated for removal, and its documentation directs subclasses that override it to "use alternative cleanup mechanisms and remove the finalize method": either Cleaner and PhantomReference, or "add a close method to explicitly release resources, and implement AutoCloseable to enable use of the try-with-resources statement". Google's style guide states the rule plainly: do not override Object.finalize, because finalization support is scheduled for removal.

## Bad

```java
class Connection {
    @Override
    protected void finalize() {
        close();
    }

    void close() {
        System.out.println("closed");
    }
}
```

## Good

```java
class Connection implements AutoCloseable {
    @Override
    public void close() {
        System.out.println("closed");
    }
}
```

## See Also

- [java-err-try-with-resources](err-try-with-resources.md) - the statement that calls close() deterministically

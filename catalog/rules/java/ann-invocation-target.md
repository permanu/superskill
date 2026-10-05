---
id: java-ann-invocation-target
lang: java
prefix: ann
title: "Unwrap InvocationTargetException to reach the real failure"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [reflection, invocation, cause, exception]
  files: ["**/*.java"]
  symbols: [InvocationTargetException]
related: [java-ann-getdeclaredmethod]
sources:
  - title: "InvocationTargetException API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java/lang/reflect/InvocationTargetException.html
---
> The invoked method's failure is the cause; rethrow or report that, not the wrapper.

## Why

The InvocationTargetException documentation says it "is a checked exception that wraps an exception thrown by an invoked method or constructor", and getCause "returns the cause of this exception (the thrown target exception, which may be null)". Code that catches the wrapper and reports its message loses the actual failure's type and stack trace, so debugging starts one level away from the problem.

## Bad

```java
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

class Invoker {
    Object call(Object target, Method method) throws Exception {
        try {
            return method.invoke(target);
        } catch (InvocationTargetException e) {
            throw new IllegalStateException(e.getMessage());
        }
    }
}
```

## Good

```java
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

class Invoker {
    Object call(Object target, Method method) throws Exception {
        try {
            return method.invoke(target);
        } catch (InvocationTargetException e) {
            throw new IllegalStateException(e.getCause());
        }
    }
}
```

## See Also

- [java-ann-getdeclaredmethod](ann-getdeclaredmethod.md) - finding the method being invoked

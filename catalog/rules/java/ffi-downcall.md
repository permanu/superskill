---
id: java-ffi-downcall
lang: java
prefix: ffi
title: "Call native functions through a Linker downcall handle"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ffm, linker, downcall, native]
  files: ["**/*.java"]
  symbols: [Linker.downcallHandle]
related: [java-ffi-symbol-lookup]
sources:
  - title: "Linker API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/Linker.html
---
> Bind foreign functions with downcallHandle instead of hand-written native methods.

## Why

The Linker documentation says a linker "provides access to foreign functions from Java code, and access to Java code from foreign functions", and its downcallHandle method creates a method handle for calling a foreign function with a declared signature. A hand-written native method moves the call into JNI, where the signature is checked by the toolchain and failures appear as UnsatisfiedLinkError; the linker keeps the signature in Java as a MethodHandle the caller can inspect.

## Bad

```java
class Libc {
    static native long strlen(String value);
}
```

## Good

```java
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.ValueLayout;
import java.lang.invoke.MethodHandle;

class Libc {
    MethodHandle strlen() {
        Linker linker = Linker.nativeLinker();
        return linker.downcallHandle(
                linker.defaultLookup().find("strlen").orElseThrow(),
                FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS));
    }
}
```

## See Also

- [java-ffi-symbol-lookup](ffi-symbol-lookup.md) - locating the foreign function to call

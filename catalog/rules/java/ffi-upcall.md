---
id: java-ffi-upcall
lang: java
prefix: ffi
title: "Expose Java callbacks with upcallStub"
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ffm, upcall, callback, linker]
  files: ["**/*.java"]
  symbols: [Linker.upcallStub]
related: [java-ffi-downcall]
sources:
  - title: "Linker API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/Linker.html
---
> Turn a MethodHandle into a function pointer the native side can call.

## Why

The Linker documentation describes the linker as providing "access to Java code from foreign functions", and upcallStub creates a method handle converted into a memory segment that foreign code can invoke as a function pointer. Registering JNI callbacks by hand requires a native shim per signature; the stub keeps the callback's descriptor and lifetime in Java, tied to an Arena.

## Bad

```java
class Events {
    static native void register(Events handler);

    void onEvent(int code) {
    }
}
```

## Good

```java
import java.lang.foreign.Arena;
import java.lang.foreign.FunctionDescriptor;
import java.lang.foreign.Linker;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.ValueLayout;
import java.lang.invoke.MethodHandle;
import java.lang.invoke.MethodHandles;
import java.lang.invoke.MethodType;

class Events {
    MemorySegment stub(Arena arena) throws NoSuchMethodException, IllegalAccessException {
        MethodHandle target = MethodHandles.lookup().findStatic(Events.class, "onEvent",
                MethodType.methodType(void.class, int.class));
        return Linker.nativeLinker().upcallStub(target,
                FunctionDescriptor.ofVoid(ValueLayout.JAVA_INT), arena);
    }

    private static void onEvent(int code) {
    }
}
```

## See Also

- [java-ffi-downcall](ffi-downcall.md) - the reverse direction, calling native code

---
id: java-anti-primitive-varargs
lang: java
prefix: anti
title: "Do not pass a primitive array as the only varargs argument"
severity: should
enforce: tool
tool: "errorprone:PrimitiveArrayPassedToVarargsMethod"
baseline: latest
status: verified
triggers:
  keywords: [varargs, array, boxing, primitive]
  files: ["**/*.java"]
  symbols: [PrimitiveArrayPassedToVarargsMethod]
related: [java-anti-list-of-null]
sources:
  - title: "Error Prone: PrimitiveArrayPassedToVarargsMethod"
    url: https://errorprone.info/bugpattern/PrimitiveArrayPassedToVarargsMethod
---
> int[] passed to Object... becomes one element, not many.

## Why

Error Prone's PrimitiveArrayPassedToVarargsMethod check explains that "when you pass a primitive array as the only argument to a varargs method, the primitive array is autoboxed into a single-element Object array. This is usually not what was intended." The call compiles and returns a collection with one element — the array itself — instead of one element per number.

## Bad

```java
import java.util.Arrays;

class Numbers {
    Object values(int[] raw) {
        return Arrays.asList(raw);
    }
}
```

## Good

```java
import java.util.Arrays;

class Numbers {
    Object values(int[] raw) {
        return Arrays.stream(raw).boxed().toList();
    }
}
```

## See Also

- [java-anti-list-of-null](anti-list-of-null.md) - another factory whose contract surprises callers

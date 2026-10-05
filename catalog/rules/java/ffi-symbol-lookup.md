---
id: java-ffi-symbol-lookup
lang: java
prefix: ffi
title: "Locate foreign functions with a SymbolLookup"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [ffm, symbol, lookup, library]
  files: ["**/*.java"]
  symbols: [SymbolLookup.libraryLookup]
related: [java-ffi-downcall]
sources:
  - title: "SymbolLookup API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/lang/foreign/SymbolLookup.html
---
> Load the library through a symbol lookup instead of System.loadLibrary by name.

## Why

SymbolLookup.libraryLookup "loads a library with the given name (if not already loaded) and creates a symbol lookup for symbols in that library", and the lookup's find method returns the symbol's address as a MemorySegment. Resolving symbols through the lookup keeps the library handle and the symbol addresses in the same API as the downcall handle, and reports a missing symbol as an empty Optional rather than an UnsatisfiedLinkError at first call.

## Bad

```java
class Native {
    static {
        System.loadLibrary("example");
    }

    static native long compute(long value);
}
```

## Good

```java
import java.lang.foreign.Arena;
import java.lang.foreign.MemorySegment;
import java.lang.foreign.SymbolLookup;

class Native {
    MemorySegment computeSymbol() {
        SymbolLookup lookup = SymbolLookup.libraryLookup("example", Arena.global());
        return lookup.find("compute").orElseThrow();
    }
}
```

## See Also

- [java-ffi-downcall](ffi-downcall.md) - turning the symbol into a callable handle

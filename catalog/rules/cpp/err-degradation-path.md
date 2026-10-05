---
id: cpp-err-degradation-path
lang: cpp
prefix: err
title: With exceptions disabled, keep RAII plus explicit checks and fail fast when recovery is impossible
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [no-exceptions, fail-fast, error-codes, embedded]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [abort, "[[nodiscard]]"]
related: [cpp-err-error-code-systematic, cpp-err-ctor-failure, cpp-err-no-throw-across-c]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: GNU libstdc++ manual - Exceptions
    url: https://gcc.gnu.org/onlinedocs/libstdc++/manual/using_exceptions.html
---
> Without exceptions, mark fallible factories nodiscard and check them, and abort on errors you cannot recover.

## Why

Disabling exceptions removes the only non-intrusive way to signal failure from a constructor or deep call, so the failure must be surfaced as a checked value; a missed check then continues with a broken invariant. RAII still manages resources, but construction that can fail needs a `valid()` query or a factory result, and an error the local context cannot handle must terminate deliberately rather than corrupt state.

## Bad

```cpp
struct Gadget {
    explicit Gadget(int config);
    int id() const;
    bool valid() const;
};

int run(int config) {
    Gadget gadget{config};
    // Bad: the construction check is skipped and id() reads a dead object.
    return gadget.id();
}
```

## Good

```cpp
struct Gadget {
    explicit Gadget(int config);
    int id() const;
    bool valid() const;
};

[[nodiscard]] int run(int config) {
    Gadget gadget{config};
    if (!gadget.valid())
        return -1; // failure handed to the caller, never ignored
    return gadget.id();
}
```

## See Also

- [cpp-err-error-code-systematic](err-error-code-systematic.md) - the systematic channel to standardize on
- [cpp-err-ctor-failure](err-ctor-failure.md) - factory with expected where the codebase allows it
- [cpp-err-no-throw-across-c](err-no-throw-across-c.md) - boundaries that must be total

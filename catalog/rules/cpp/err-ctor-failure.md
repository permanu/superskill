---
id: cpp-err-ctor-failure
lang: cpp
prefix: err
title: Throw from a constructor that cannot establish the invariant, or use a factory returning expected
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [constructor, invariant, failure, factory]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::expected]
related: [cpp-err-expected-for-recoverable, cpp-err-dtor-noexcept]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> A constructor that cannot establish the class invariant throws; if throwing is not allowed, a factory returns expected.

## Why

A constructor has no return value, so failure cannot be reported through one. A half-constructed object forces every caller to check an `is_open()`/`valid()` flag before every use, and one missed check turns a detectable failure into undefined behavior. Throwing abandons the object and runs the destructors of already-constructed members; where exceptions are unavailable, a static factory returning `std::expected` keeps the type always-valid.

## Bad

```cpp
#include <cstdio>
#include <string>

class File {
public:
    explicit File(const std::string& path) { open(path); }
    bool is_open() const { return handle_ != nullptr; } // every caller must check
    void write(const std::string& text);
private:
    void open(const std::string& path);
    std::FILE* handle_ = nullptr;
};
```

## Good

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>

class File {
public:
    explicit File(const std::string& path)
        : handle_(std::fopen(path.c_str(), "w")) {
        if (handle_ == nullptr)
            throw std::runtime_error("cannot open " + path);
    }
    File(const File&) = delete;
    File& operator=(const File&) = delete;
    ~File() { std::fclose(handle_); }

    void write(const std::string& text);
private:
    std::FILE* handle_;
};
```

## See Also

- [cpp-err-expected-for-recoverable](err-expected-for-recoverable.md) - the factory alternative when exceptions are off the table
- [cpp-err-dtor-noexcept](err-dtor-noexcept.md) - throwing constructors make non-throwing destructors more important

---
id: cpp-err-dtor-noexcept
lang: cpp
prefix: err
title: Do not let destructors, move operations, or swap throw; expose an explicit failure path instead
severity: must
enforce: both
tool: clang-tidy:bugprone-exception-escape
baseline: latest
status: verified
triggers:
  keywords: [destructor, move, swap, cleanup, terminate]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [~T, std::swap]
related: [cpp-err-noexcept-truthful, cpp-err-raii-not-catch]
sources:
  - title: cppreference - noexcept specifier
    url: https://en.cppreference.com/w/cpp/language/noexcept_spec
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> Destructors, moves, and swap must not throw; report cleanup failure through an explicit close/release operation.

## Why

Destructors are implicitly noexcept and run during stack unwinding, where a second exception leaves the runtime no safe choice and calls `std::terminate`. The standard library assumes destructors and swap never throw; violating that breaks container invariants and leaks. A resource that can fail to release exposes a `close()`/`release()` method that reports the failure while the object is still under the caller's control.

## Bad

```cpp
#include <stdexcept>

struct Connection {
    int close();
    ~Connection() {
        if (close() != 0)
            throw std::runtime_error("close failed"); // std::terminate during unwind
    }
};
```

## Good

```cpp
#include <cstdio>

class File {
public:
    explicit File(std::FILE* handle) noexcept : handle_(handle) {}
    ~File() noexcept {
        if (handle_ != nullptr)
            std::fclose(handle_);
    }

    File(const File&) = delete;
    File& operator=(const File&) = delete;

    // Explicit path for callers that must observe release failure.
    [[nodiscard]] int close() noexcept {
        if (handle_ == nullptr)
            return 0;
        std::FILE* handle = handle_;
        handle_ = nullptr;
        return std::fclose(handle);
    }

private:
    std::FILE* handle_;
};
```

## See Also

- [cpp-err-noexcept-truthful](err-noexcept-truthful.md) - noexcept must describe what actually escapes
- [cpp-err-raii-not-catch](err-raii-not-catch.md) - RAII cleanup is the reason destructors must stay non-throwing

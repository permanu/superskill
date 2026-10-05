---
id: cpp-raii-move-valid-source
lang: cpp
prefix: raii
title: Move operations must leave the source in a valid, destructible state
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [move, moved-from, valid-state, exchange]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::exchange, T&&]
related: [cpp-raii-rule-of-five, cpp-raii-raw-non-owning]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Move constructors
    url: https://en.cppreference.com/w/cpp/language/move_constructor
---
> After a move, the source must still be destructible and assignable, never a second owner.

## Why

A moved-from object is destroyed later like any other object, so a move that leaves the source holding the same resource creates two owners and a double free. The fix is to transfer the handle and leave the source empty, for example by moving into the target and nulling the source with `std::exchange`. The standard library guarantees that moved-from standard types are valid, and user types must uphold the same contract.

## Bad

```cpp
#include <cstddef>

class Buffer {
public:
    explicit Buffer(std::size_t size) : data_(new char[size]), size_(size) {}
    Buffer(Buffer&& other) noexcept : data_(other.data_), size_(other.size_) {}
    ~Buffer() { delete[] data_; }
private:
    char* data_;
    std::size_t size_;
};
```

## Good

```cpp
#include <cstddef>
#include <utility>

class Buffer {
public:
    explicit Buffer(std::size_t size) : data_(new char[size]), size_(size) {}
    Buffer(Buffer&& other) noexcept
        : data_(std::exchange(other.data_, nullptr)),
          size_(std::exchange(other.size_, 0)) {}
    ~Buffer() { delete[] data_; }
private:
    char* data_;
    std::size_t size_;
};
```

## See Also

- [cpp-raii-rule-of-five](raii-rule-of-five.md) - move operations as part of the special member set
- [cpp-raii-raw-non-owning](raii-raw-non-owning.md) - handles that need explicit transfer

---
id: cpp-raii-rule-of-zero
lang: cpp
prefix: raii
title: Prefer the Rule of Zero; own resources through members and declare no special members
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [rule-of-zero, special-members, destructor, copy]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [~T, operator=]
related: [cpp-raii-rule-of-five, cpp-raii-wrap-resources]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - The rule of three/five/zero
    url: https://en.cppreference.com/w/cpp/language/rule_of_three
---
> Let members own resources; declare no destructor, copy, or move operations unless ownership demands it.

## Why

Hand-written special members must reproduce the compiler's member-wise behavior plus resource handling, and every omission is a bug: a user destructor without copy operations leaves the implicit shallow copy, producing double frees. When each resource is held by a member that owns it, the implicitly generated operations are already correct, so the class needs no destructor, copy, or move code at all.

## Bad

```cpp
#include <cstddef>
#include <cstring>

class Buffer {
public:
    explicit Buffer(std::size_t size) : data_(new char[size]), size_(size) {}
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& other) : data_(new char[other.size_]), size_(other.size_) {
        std::memcpy(data_, other.data_, size_);
    }
    // implicit copy assignment shallow-copies: double free
private:
    char* data_;
    std::size_t size_;
};
```

## Good

```cpp
#include <cstddef>
#include <vector>

class Buffer {
public:
    explicit Buffer(std::size_t size) : data_(size) {}
    std::size_t size() const { return data_.size(); }
private:
    std::vector<char> data_; // owns; generated operations are correct
};
```

## See Also

- [cpp-raii-rule-of-five](raii-rule-of-five.md) - what to do when special members are unavoidable
- [cpp-raii-wrap-resources](raii-wrap-resources.md) - resource ownership as the class's single responsibility

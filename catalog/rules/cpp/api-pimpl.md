---
id: cpp-api-pimpl
lang: cpp
prefix: api
title: Use the pimpl idiom when a library must keep its ABI and recompilation stable
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [pimpl, abi, compilation-firewall, header]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::unique_ptr]
related: [cpp-api-c-abi-subset, cpp-raii-rule-of-five]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - PImpl
    url: https://en.cppreference.com/w/cpp/language/pimpl
---
> Move private state behind an opaque pointer when header changes must not break users.

## Why

Private data members are part of a class's layout, so changing them changes the object size and forces every user to recompile and, for binary libraries, breaks the ABI. The pimpl idiom stores the state in a forward-declared implementation type behind a `unique_ptr`: the public header stays fixed while the implementation changes freely. The cost is one indirection and an allocation, paid where ABI stability matters.

## Bad

```cpp
#include <string>
#include <vector>

class Engine {
public:
    void start();
private:
    std::vector<int> cylinders_; // layout in the header: users recompile on change
    std::string serial_;
};
```

## Good

```cpp
#include <memory>

class Engine {
public:
    Engine();
    ~Engine();
    Engine(Engine&&) noexcept;
    Engine& operator=(Engine&&) noexcept;
    void start();
private:
    struct Impl;                 // defined in the implementation file
    std::unique_ptr<Impl> impl_; // header layout stays fixed
};
```

## See Also

- [cpp-api-c-abi-subset](api-c-abi-subset.md) - the stronger guarantee for cross-compiler binaries
- [cpp-raii-rule-of-five](raii-rule-of-five.md) - declaring all special members for the opaque handle

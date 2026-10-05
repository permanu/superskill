---
id: cpp-api-abstract-interface
lang: cpp
prefix: api
title: Prefer empty abstract classes as interfaces over bases that carry state
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [interface, abstract, hierarchy, state]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [virtual]
related: [cpp-type-regular-value-types, cpp-api-virtual-dtor]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Keep interfaces free of data and implementation; let concrete classes own state.

## Why

A base class that carries data mixes the interface with one implementation: derived classes inherit state they may not want, the base must define constructors and lifetime rules, and changes to that state recompile or break every implementer. An abstract class with only virtual functions and a virtual destructor states the contract alone, so any class can implement it without inheriting storage or behavior.

## Bad

```cpp
struct Storage {
    int capacity = 0; // base carries implementation state
    virtual void put(int value) = 0;
    virtual ~Storage() = default;
};
```

## Good

```cpp
struct Storage {
    virtual void put(int value) = 0;
    virtual ~Storage() = default;
};

struct MemoryStorage : Storage {
    void put(int value) override { last_ = value; }
    int last() const { return last_; }
private:
    int last_ = 0; // state lives in the implementation
};
```

## See Also

- [cpp-type-regular-value-types](type-regular-value-types.md) - value types when no runtime polymorphism is needed
- [cpp-api-virtual-dtor](api-virtual-dtor.md) - the destructor rule every interface must follow

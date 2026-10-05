---
id: cpp-data-self-assignment
lang: cpp
prefix: data
title: Make copy assignment safe for self-assignment
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [self-assignment, copy-assignment, resources]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [operator]
related: [cpp-data-const-members, cpp-raii-rule-of-zero]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Copy assignment operator
    url: https://en.cppreference.com/w/cpp/language/copy_assignment
---
> Assignment must survive the case where source and target are the same object.

## Why

C.62 asks to make copy assignment safe for self-assignment, because an assignment where `x = x` changes the value of `x` surprises every reader. The copy assignment reference's own example puts the guard at the top of a resource-owning operator: `if (this != &other) // not a self-assignment`. Without it, an operator that modifies the target before reading the source — clearing it, releasing its buffer — destroys the data it is about to copy, and self-assignment arrives through aliases and references as easily as through the literal `x = x`. The guard makes the operation a no-op.

## Bad

```cpp
#include <string>

struct Record {
    std::string name;
    Record& operator=(const Record& other) {
        name.clear();      // reset before loading the new value
        name = other.name; // self-assignment: the source was just cleared
        return *this;
    }
};

int main() {
    Record record{"widget"};
    Record& alias = record; // an alias hides the self-assignment
    record = alias; // the name is lost
    return record.name == "widget" ? 0 : 1;
}
```

## Good

```cpp
#include <string>

struct Record {
    std::string name;
    Record& operator=(const Record& other) {
        if (this == &other)
            return *this; // self-assignment is a no-op
        name.clear();
        name = other.name;
        return *this;
    }
};

int main() {
    Record record{"widget"};
    Record& alias = record;
    record = alias;
    return record.name == "widget" ? 0 : 1;
}
```

## See Also

- [cpp-data-const-members](data-const-members.md) - members that make assignment disappear
- [cpp-raii-rule-of-zero](raii-rule-of-zero.md) - letting members handle assignment

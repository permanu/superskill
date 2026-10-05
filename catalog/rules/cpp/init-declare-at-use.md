---
id: cpp-init-declare-at-use
lang: cpp
prefix: init
title: Declare a variable where its value exists
severity: prefer
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [scope, declaration, initialization-order]
  files: ["**/*.cpp"]
  symbols: []
related: [cpp-init-brace-init, cpp-unsafe-uninitialized-read]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - Default-initialization
    url: https://en.cppreference.com/w/cpp/language/default_initialization
---
> A variable declared before its value exists spends time in a state nobody wants.

## Why

ES.21 asks not to introduce a variable before you need to use it, and ES.22 not to declare one until you have a value to initialize it with. The default-initialization reference shows what the gap contains: an object with no initializer retains an indeterminate value until it is replaced, and every use of that value is undefined behavior. Declaring the variable at the point where the value is known closes the gap by construction and keeps its scope as small as its use.

## Bad

```cpp
#include <string>

int main() {
    std::string name; // introduced before the value exists
    int score = 0;
    name = "widget"; // assigned when the value arrives
    return name == "widget" && score == 0 ? 0 : 1;
}
```

## Good

```cpp
#include <string>

int main() {
    const std::string name = "widget"; // declared where the value exists
    const int score = 0;
    return name == "widget" && score == 0 ? 0 : 1;
}
```

## See Also

- [cpp-init-brace-init](init-brace-init.md) - initializing in the declaration
- [cpp-unsafe-uninitialized-read](unsafe-uninitialized-read.md) - what the gap costs when it is read

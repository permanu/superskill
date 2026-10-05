---
id: cpp-const-ref-params
lang: cpp
prefix: const
title: Pass pointers and references to const by default
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [const, parameters, references, pointers]
  files: ["**/*.hpp", "**/*.cpp"]
  symbols: [const]
related: [cpp-const-member-functions, cpp-api-param-passing]
sources:
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
  - title: cppreference - cv type qualifiers
    url: https://en.cppreference.com/w/cpp/language/cv
---
> A function that reads should accept const objects and temporaries, not demand lvalues.

## Why

Con.3 asks to pass pointers and references to consts by default. A parameter of type `T&` promises the caller that the function may modify the object, so const objects and temporaries cannot bind to it — the cv reference's conversion rules allow adding constness implicitly but not removing it. A read-only parameter as `const T&` accepts every object the function can actually use and states the no-modify promise in the signature.

## Bad

```cpp
#include <string>

void log_length(std::string& text) { // reads only, but requires a non-const lvalue
    (void)text.size();
}

int main() {
    std::string name = "service";
    log_length(name);
    return 0;
}
```

## Good

```cpp
#include <string>

void log_length(const std::string& text) { // reads: takes const&
    (void)text.size();
}

int main() {
    log_length(std::string("service")); // binds a temporary
    return 0;
}
```

## See Also

- [cpp-const-member-functions](const-member-functions.md) - the same discipline inside classes
- [cpp-api-param-passing](api-param-passing.md) - choosing the parameter form

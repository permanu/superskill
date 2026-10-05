---
id: cpp-obs-nested-cause
lang: cpp
prefix: obs
title: Walk the nested exception chain when reporting a failure
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nested, exception, cause, reporting]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::rethrow_if_nested]
related: [cpp-obs-exception-what, cpp-err-translate-with-context]
sources:
  - title: cppreference - std::throw_with_nested
    url: https://en.cppreference.com/w/cpp/error/throw_with_nested
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> When printing a caught exception, rethrow_if_nested so every layer of cause appears.

## Why

An exception translated at each layer carries its causes in a `std::nested_exception` chain, but a reporter that prints only the outermost `what()` shows the layer that noticed the problem, not the layer that caused it. `std::rethrow_if_nested` rethrows the stored inner exception so a recursive printer can emit the whole chain, from the top-level message down to the original failure. Without it, the most useful part of the report is invisible.

## Bad

```cpp
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("loading config failed");
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n'; // any nested cause is never printed
    }
}
```

## Good

```cpp
#include <exception>
#include <iostream>
#include <stdexcept>

void print(const std::exception& e) {
    std::cerr << e.what() << '\n';
    try {
        std::rethrow_if_nested(e);
    } catch (const std::exception& nested) {
        print(nested); // recurse through the cause chain
    }
}

int main() {
    try {
        std::throw_with_nested(std::runtime_error("loading config failed"));
    } catch (const std::exception& e) {
        print(e);
    }
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - printing the message at all
- [cpp-err-translate-with-context](err-translate-with-context.md) - building the chain that this prints

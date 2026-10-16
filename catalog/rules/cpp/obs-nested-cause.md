---
id: cpp-obs-nested-cause
lang: cpp
prefix: obs
title: Bound and classify nested exception chains without logging their messages
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [nested, exception, cause, reporting]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::rethrow_if_nested]
related: [shared-obs-allowlisted-diagnostics, cpp-obs-exception-what, cpp-err-translate-with-context]
sources:
  - title: C++ draft - Nested exceptions
    url: https://eel.is/c++draft/except.nested
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  - title: cppreference - std::throw_with_nested
    url: https://en.cppreference.com/w/cpp/error/throw_with_nested
  - title: cppreference - std::exception
    url: https://en.cppreference.com/w/cpp/error/exception
---
> Traverse nested causes only within a fixed depth bound and emit approved classifications instead of exception messages.

## Why

Nested exceptions preserve useful causal structure, but their messages can contain sensitive data and an uncontrolled recursive traversal can exhaust resources. Check that a nested exception pointer exists before rethrowing it, cap traversal depth and handle non-standard exceptions. Emit only reviewed categories; preserving the cause internally does not authorize exporting it.

## Bad

```cpp
#include <exception>
#include <iostream>
#include <stdexcept>

int main() {
    try {
        try { throw std::invalid_argument("sensitive inner context"); }
        catch (...) { std::throw_with_nested(std::runtime_error("outer context")); }
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

void report(const std::exception& e, unsigned depth = 0) {
    if (depth >= 8) { std::cerr << "cause.limit\n"; return; }
    std::cerr << (dynamic_cast<const std::invalid_argument*>(&e) ? "cause.invalid_input\n" : "cause.failure\n");
    const auto* nested = dynamic_cast<const std::nested_exception*>(&e);
    if (!nested || !nested->nested_ptr()) return;
    try {
        std::rethrow_exception(nested->nested_ptr());
    } catch (const std::exception& cause) { report(cause, depth + 1); }
      catch (...) { std::cerr << "cause.unknown\n"; }
}

int main() {
    try {
        try { throw std::invalid_argument("sensitive inner context"); }
        catch (...) { std::throw_with_nested(std::runtime_error("outer context")); }
    } catch (const std::exception& e) {
        report(e);
    }
}
```

## See Also

- [cpp-obs-exception-what](obs-exception-what.md) - classifying failures without message disclosure
- [cpp-err-translate-with-context](err-translate-with-context.md) - building the chain that this prints

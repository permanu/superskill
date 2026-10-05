---
id: cpp-err-translate-with-context
lang: cpp
prefix: err
title: Wrap a translated exception with std::throw_with_nested to preserve the original cause
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [translate, rethrow, nested, context, cause]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: [std::throw_with_nested, std::nested_exception]
related: [cpp-err-no-catch-all-swallow]
sources:
  - title: cppreference - std::throw_with_nested
    url: https://en.cppreference.com/w/cpp/error/throw_with_nested
  - title: isocpp.org FAQ - Exceptions and Error Handling
    url: https://isocpp.org/wiki/faq/exceptions
---
> When mapping an exception to a richer type, throw_with_nested so the original cause stays inspectable.

## Why

Catching a low-level failure and throwing a higher-level message is how layers report their own vocabulary, but replacing the object discards the original exception: type, message, and stack of causes are gone. `std::throw_with_nested` captures the in-flight exception in a `std::nested_exception` base, so a top-level handler can walk the chain with `std::rethrow_if_nested` and print the full story.

## Bad

```cpp
#include <stdexcept>
#include <string>

struct Config { };
Config parse(const std::string& text);
std::string read_file(const std::string& path);

Config load_config(const std::string& path) {
    try {
        return parse(read_file(path));
    } catch (const std::exception&) {
        // Bad: cause and original type are discarded.
        throw std::runtime_error("loading " + path + " failed");
    }
}
```

## Good

```cpp
#include <exception>
#include <stdexcept>
#include <string>

struct Config { };
Config parse(const std::string& text);
std::string read_file(const std::string& path);

Config load_config(const std::string& path) {
    try {
        return parse(read_file(path));
    } catch (const std::exception&) {
        // Good: new context plus the original exception as the nested cause.
        std::throw_with_nested(std::runtime_error("loading " + path + " failed"));
    }
}
```

## See Also

- [cpp-err-no-catch-all-swallow](err-no-catch-all-swallow.md) - translation must never drop the failure

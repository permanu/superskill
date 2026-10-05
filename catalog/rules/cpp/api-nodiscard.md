---
id: cpp-api-nodiscard
lang: cpp
prefix: api
title: Mark functions nodiscard when ignoring their result is a bug
severity: should
enforce: both
tool: clang:-Wunused-result
baseline: latest
status: verified
triggers:
  keywords: [nodiscard, result, ignored, warning]
  files: ["**/*.cpp", "**/*.hpp"]
  symbols: ["[[nodiscard]]"]
related: [cpp-api-return-struct, cpp-err-error-code-systematic]
sources:
  - title: cppreference - nodiscard attribute
    url: https://en.cppreference.com/w/cpp/language/attributes/nodiscard
  - title: C++ Core Guidelines
    url: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
---
> Annotate results that must be used with [[nodiscard]] so discarding them warns.

## Why

Status returns and created objects are easy to drop: the call looks like a statement and the failure or the handle silently disappears. `[[nodiscard]]` makes the compiler warn on a discarded result, turning a class of bugs into build diagnostics; a reason string can state why the value matters. The annotation is part of the interface contract, not an implementation detail.

## Bad

```cpp
#include <string>

bool save(const std::string& path); // callers may ignore failure silently

int main() {
    save("data.bin"); // result discarded
    return 0;
}
```

## Good

```cpp
#include <string>

[[nodiscard("check the failure before continuing")]]
bool save(const std::string& path);

int main() {
    if (!save("data.bin"))
        return 1;
    return 0;
}
```

## See Also

- [cpp-api-return-struct](api-return-struct.md) - making multi-value results hard to drop
- [cpp-err-error-code-systematic](err-error-code-systematic.md) - status values that must be checked
